/**
 * Тести читання історії зрізів.
 *
 * Головне тут — **не числа, а ключі**. Точка історії несе `totals`, і його
 * читають чужі функції (`metricSeries` — графік, `SnapshotHistory` — таблиця).
 * Якщо словник скласти з самої метрики, він виглядатиме заповненим, а кожне
 * число стане нулем: `Record<string, number>` приймає обидва формати, тож ні
 * компілятор, ні рев'ю цього не побачать — тільки сторінка, де замість
 * динаміки рівна лінія по нулях.
 *
 * Тому тест читає історію **тими самими очима, що й сторінка**, і вимагає
 * справжніх чисел, а не «словник не порожній».
 *
 * @module api-dev/src/services/monitoring/read.test
 */

import { describe, expect, it } from "vitest";
import { TOTAL_GROUP, metricSeries, type MonitoringSnapshot } from "@wwwuabot/shared/monitoring";
import type { Env } from "../../shared/types";
import { readHistory, readLatest, readPrevious, readSources, readSummary } from "./read";
import type { SnapshotRow, ValueRow } from "./rows";

function snapshotRow(id: number, collectedAt: string): SnapshotRow {
  return {
    id,
    collected_at: collectedAt,
    trigger_kind: "manual",
    status: "ok",
    git_ref: "85a6045d964e89f9cb003cc2aa74ffc3ed44e002",
    collectors: "[]",
  };
}

function valueRow(snapshotId: number, metric: string, value: number): ValueRow {
  return { snapshot_id: snapshotId, group_key: TOTAL_GROUP, metric, value };
}

/** KV у мініатюрі: один ключ — те, що в нього поклали.
 *
 * `readLatest` спершу питає кеш, і саме тому KV мусить бути в тесті: без нього
 * не видно ні гілки «кеш живий», ні полагодження кешу з D1.
 */
function fakeKv(initial: MonitoringSnapshot | null = null) {
  let value = initial;
  const kv = {
    get: async () => value,
    put: async (_key: string, raw: string) => {
      value = JSON.parse(raw) as MonitoringSnapshot;
    },
  };
  return { kv, read: () => value };
}

/**
 * D1 у мініатюрі: відповідь залежить від SQL, а не від порядку викликів —
 * інакше тест ламався б від будь-якої зміни в реалізації.
 */
function fakeEnv(
  snapshots: SnapshotRow[],
  values: ValueRow[],
  kv: ReturnType<typeof fakeKv>["kv"] = fakeKv().kv,
): Env {
  const db = {
    prepare: (sql: string) => {
      const statement = {
        bind: () => statement,
        all: async (): Promise<{ results: unknown[] }> => ({
          results: sql.includes("metrics_snapshots")
            ? snapshots
            : sql.includes("metrics_values")
              ? values
              : [],
        }),
        first: async (): Promise<SnapshotRow | null> =>
          sql.includes("WHERE id < ?") ? (snapshots[1] ?? null) : (snapshots[0] ?? null),
        run: async () => ({}),
      };
      return statement;
    },
  };

  return { DB: db, CONTENT_KV: kv } as unknown as Env;
}

describe("readHistory", () => {
  const snapshots = [
    snapshotRow(2, "2026-09-24T19:04:45.201Z"),
    snapshotRow(1, "2026-09-24T13:17:24.821Z"),
  ];
  const values = [valueRow(1, "code.lines", 100), valueRow(2, "code.lines", 250)];

  it("віддає динаміку, а не нулі: графік читає історію тим самим ключем", async () => {
    const history = await readHistory(fakeEnv(snapshots, values));

    expect(metricSeries(history, "code.lines")).toEqual([100, 250]);
  });

  it("точка несе стан, розклад і коміт — щоб зріз можна було впізнати", async () => {
    const [latest] = await readHistory(fakeEnv(snapshots, values));

    expect(latest).toMatchObject({
      id: 2,
      status: "ok",
      trigger: "manual",
      ref: "85a6045d964e89f9cb003cc2aa74ffc3ed44e002",
    });
  });

  it("порожня база — порожня історія, а не помилка", async () => {
    expect(await readHistory(fakeEnv([], []))).toEqual([]);
  });

  it("показник, якого в зрізі немає, лишається нулем — «не міряли» не вигадується", async () => {
    const history = await readHistory(fakeEnv(snapshots, values));

    expect(metricSeries(history, "github.stars")).toEqual([0, 0]);
  });
});

describe("readSources", () => {
  it("без токенів каже правду: репо типове, доступу до приватного нема", () => {
    expect(readSources({} as Env)).toEqual({
      repo: "BotDev369/wwwuabot",
      githubTokenConfigured: false,
      cloudflareConfigured: false,
      cronSchedule: null,
    });
  });

  it("порожній репо у змінній не затирає типове, а токени видно як налаштовані", () => {
    const sources = readSources({
      MONITOR_GITHUB_REPO: "  ",
      GITHUB_MONITOR_TOKEN: "token",
      CF_MONITOR_TOKEN: "token",
      MONITOR_CF_ACCOUNT_ID: "account",
    } as unknown as Env);

    expect(sources).toMatchObject({
      repo: "BotDev369/wwwuabot",
      githubTokenConfigured: true,
      cloudflareConfigured: true,
    });
  });
});

describe("readLatest", () => {
  const row = snapshotRow(1, "2026-09-24T13:17:24.821Z");

  it("живий кеш віддається без запиту в D1", async () => {
    const cached = { id: 7 } as MonitoringSnapshot;
    const env = fakeEnv([row], [], fakeKv(cached).kv);

    expect(await readLatest(env)).toEqual(cached);
  });

  it("порожній кеш відновлює зріз із D1 і полагоджує кеш", async () => {
    const store = fakeKv();
    const latest = await readLatest(fakeEnv([row], [valueRow(1, "code.lines", 100)], store.kv));

    expect(latest).toMatchObject({ id: 1 });
    expect(store.read()).toMatchObject({ id: 1 });
  });

  it("порожня база — `null`, а не помилка", async () => {
    expect(await readLatest(fakeEnv([], []))).toBeNull();
  });
});

describe("readPrevious", () => {
  it("бере зріз, що передує даному", async () => {
    const env = fakeEnv(
      [snapshotRow(2, "2026-09-24T19:04:45.201Z"), snapshotRow(1, "2026-09-24T13:17:24.821Z")],
      [],
    );

    expect(await readPrevious(env, 2)).toMatchObject({ id: 1 });
  });

  it("першому зрізу нема з чим порівнюватись", async () => {
    expect(await readPrevious(fakeEnv([], []), 1)).toBeNull();
  });
});

describe("readSummary", () => {
  it("віддає джерела, останній, попередній та історію одним читанням", async () => {
    const env = fakeEnv(
      [snapshotRow(2, "2026-09-24T19:04:45.201Z"), snapshotRow(1, "2026-09-24T13:17:24.821Z")],
      [valueRow(2, "code.lines", 250)],
    );

    const summary = await readSummary(env);

    expect(summary.latest).toMatchObject({ id: 2 });
    expect(summary.previous).toMatchObject({ id: 1 });
    expect(summary.history).toHaveLength(2);
    expect(summary.sources.cronSchedule).toBeNull();
  });

  it("порожня база — порожній зріз, а не падіння сторінки", async () => {
    const summary = await readSummary(fakeEnv([], []));

    expect(summary).toMatchObject({ latest: null, previous: null, history: [] });
  });
});
