/**
 * Межа тіла аналізу: **розбір не дорівний розрахунку**.
 *
 * Тут важлива не арифметика (її перевіряють тести `mydate-helpers`), а межа
 * перед нею: тіло, з яким ми не працюємо, має відпадати **до** читання KV і D1.
 * Тому в цих тестах середовище порожнє — будь-який крок углиб кинув би `500`,
 * і це видно: `400` означає, що розбір зупинив запит на вході.
 *
 * @module api-dev/src/controllers/astrology.controller.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../shared/types";
import { aboutFor } from "../shared/mydate-interpretation-helpers";
import { INIT_DATA_HEADER } from "@wwwuabot/shared/security/telegram";
import {
  handleAnalysisRead,
  handleAnalyze,
  handleCompare,
  handleSystems,
} from "./astrology.controller";

const BOT_TOKEN = "123456:TEST-BOT-TOKEN";

function request(path: string, body: unknown, initData?: string): Request {
  return new Request(`https://api.example.com${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(initData ? { [INIT_DATA_HEADER]: initData } : {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

// ── Підпис initData ───────────────────────────────────────────────
// Копія зі `my-dates.controller.test.ts`, і навмисно: це фікстура тесту, а не
// код продукту. Підписувач у `shared/src` умів би підробити ідентичність.

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function signedInitData(userId = 777): Promise<string> {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: userId, first_name: "Тест" }),
  });
  const checkString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secret = await hmac(new TextEncoder().encode("WebAppData"), BOT_TOKEN);
  params.set("hash", toHex(await hmac(secret, checkString)));
  return params.toString();
}

/** Середовище без бази й KV: крок углиб упав би, а не «повернув порожнє». */
const EMPTY_ENV = {} as Env;

const SYSTEM = {
  id: "western",
  name: "Західна астрологія",
  description: "",
  // Параметри в рядку лежать JSON-рядком — саме так їх віддає D1.
  parameters: JSON.stringify([{ key: "sunSign", label: "Знак Сонця" }]),
  implemented: 1,
  is_active: 1,
  position: 10,
};

/**
 * Реєстр із бази. `implemented = 0` і `is_active = 0` імітуємо **фільтром у
 * запиті**: інакше тест «порівняння бере тільки реалізовані» перевіряв би
 * сам фейк, а не рішення сервісу.
 */
function makeEnv(
  rows: (typeof SYSTEM)[] = [SYSTEM],
  dates: Array<{ date: string; name: string | null }> = [],
): Env {
  const kv = new Map<string, string>();
  const db = {
    prepare(sql: string) {
      const statement = {
        bind: () => statement,
        first: async () => null,
        all: async () => {
          if (/FROM my_dates/.test(sql)) return { results: dates };
          if (!/FROM analysis_systems/.test(sql)) return { results: [] };
          // Умова `is_active` виконується за текстом запиту: якщо SQL перестане
          // фільтрувати, тест «вимкнена система не показується» стане зеленим
          // на повному реєстрі й нічого не перевірятиме.
          const active = /COALESCE\(is_active,\s*1\)\s*=\s*1/.test(sql)
            ? rows.filter((row) => row.is_active)
            : rows;
          return { results: active };
          return { results: [] };
        },
        run: async () => ({ meta: { changes: 1 } }),
      };
      return statement;
    },
  };
  return {
    BOT_TOKEN,
    DB: db as unknown as D1Database,
    CONTENT_KV: {
      get: async (key: string) => kv.get(key) ?? null,
      put: async (key: string, value: string) => {
        kv.set(key, value);
      },
    } as unknown as KVNamespace,
  } as unknown as Env;
}

describe("⛔ тіло, з яким ми не працюємо", () => {
  it("не-об'єкт у тілі не доходить до розрахунку", async () => {
    const res = await handleAnalyze(request("/api/mydate/analyze", `"2026-01-01"`), EMPTY_ENV);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid body" });
  });

  it("причина відмови лишається зрозумілою, а не безликою", async () => {
    const res = await handleAnalyze(
      request("/api/mydate/analyze", { systemId: "astro" }),
      EMPTY_ENV,
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "Invalid or missing date" });
  });

  // Регресія: числа в переліку дат доходили до `DATE_RE`, який їх відсікав
  // непомітно, і людина отримувала «No valid dates» замість «Invalid body».
  it("дати мають бути рядками, а не числами", async () => {
    const res = await handleCompare(
      request("/api/mydate/compare", { dates: [20260101] }),
      EMPTY_ENV,
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid body" });
  });
});

describe("✓ тіло, з яким працюємо", () => {
  it("брак дат — це вже про розрахунок, а не про розбір тіла", async () => {
    const res = await handleCompare(request("/api/mydate/compare", { dates: [] }), EMPTY_ENV);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "No valid dates provided" });
  });
});

describe("реєстр систем приходить з бази", () => {
  it("список показує й нереалізовану систему — вона обіцянка, а не помилка", async () => {
    const res = await handleSystems(makeEnv([SYSTEM, { ...SYSTEM, id: "vedic", implemented: 0 }]));
    const body = (await res.json()) as { systems: Array<{ id: string; implemented: boolean }> };

    expect(res.status).toBe(200);
    expect(body.systems.map((s) => s.id)).toEqual(["western", "vedic"]);
    expect(body.systems[1].implemented).toBe(false);
  });

  /**
   * Вітрина систем показує, **що визначає** параметр, ще без жодної дати:
   * пояснення приходить разом із реєстром.
   */
  it("параметри приходять із поясненнями з довідника", async () => {
    const res = await handleSystems(makeEnv());
    const body = (await res.json()) as {
      systems: Array<{ parameters: Array<{ key: string; about?: string }> }>;
    };

    expect(body.systems[0].parameters[0].key).toBe("sunSign");
    expect(body.systems[0].parameters[0].about).toBe(aboutFor("western", "sunSign"));
  });

  it("вимкнена система не потрапляє у вибір", async () => {
    const res = await handleSystems(makeEnv([SYSTEM, { ...SYSTEM, id: "hidden", is_active: 0 }]));
    const body = (await res.json()) as { systems: Array<{ id: string }> };

    expect(body.systems.map((s) => s.id)).toEqual(["western"]);
  });
});

describe("розрахунок і порівняння", () => {
  it("невідоме `systemId` каже «ще не реалізовано», а не `404`", async () => {
    const res = await handleAnalyze(
      request("/api/mydate/analyze", { date: "1980-03-03" }),
      makeEnv(),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "Missing systemId" });
  });

  it("розрахунок зберігається й повертається разом із системою", async () => {
    const res = await handleAnalyze(
      request("/api/mydate/analyze", { date: "1980-03-03", systemId: "western" }),
      makeEnv(),
    );
    const body = (await res.json()) as { ok: boolean; systems: Record<string, unknown> };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(Object.keys(body.systems)).toEqual(["western"]);
  });

  it("система, формули для якої немає, каже про це сама", async () => {
    const res = await handleAnalyze(
      request("/api/mydate/analyze", { date: "1980-03-03", systemId: "китайська" }),
      makeEnv([{ ...SYSTEM, id: "китайська", implemented: 0 }]),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      ok: false,
      error: 'System "китайська" is not implemented yet',
    });
  });

  it("без дати причина лишається зрозумілою", async () => {
    const res = await handleAnalyze(
      request("/api/mydate/analyze", { systemId: "western" }),
      makeEnv(),
    );
    expect(await res.json()).toEqual({ ok: false, error: "Invalid or missing date" });
  });

  it("порівняння бере тільки реалізовані системи, а не весь реєстр", async () => {
    const res = await handleCompare(
      request("/api/mydate/compare", { dates: ["1980-03-03"] }),
      makeEnv([SYSTEM, { ...SYSTEM, id: "vedic", implemented: 0 }]),
    );
    const body = (await res.json()) as { systems: string[]; matrix: Record<string, unknown> };

    expect(res.status).toBe(200);
    expect(body.systems).toEqual(["western"]);
    expect(Object.keys(body.matrix)).toEqual(["1980-03-03"]);
  });

  it("порівняння відкидає не-дати, але зберігає решту", async () => {
    const res = await handleCompare(
      request("/api/mydate/compare", { dates: ["1980-03-03", "не дата"] }),
      makeEnv(),
    );
    const body = (await res.json()) as { dates: string[] };

    expect(body.dates).toEqual(["1980-03-03"]);
  });

  // `systemIds` у тілі — це вибір із реєстру, а не новий список: нехай у базі
  // лишаються дві системи, але порівняння рахує одну.
  it("перелік `systemIds` відсікає системи, яких у ньому немає", async () => {
    const res = await handleCompare(
      request("/api/mydate/compare", { dates: ["1980-03-03"], systemIds: ["western"] }),
      makeEnv([SYSTEM, { ...SYSTEM, id: "vedic" }]),
    );
    const body = (await res.json()) as { systems: string[] };

    expect(body.systems).toEqual(["western"]);
  });

  it("більше 30 дат — відмова, а не довгий розрахунок", async () => {
    const dates = Array.from({ length: 31 }, (_, i) => `1980-01-${String(i + 1).padStart(2, "0")}`);
    const res = await handleCompare(request("/api/mydate/compare", { dates }), makeEnv());

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "Too many dates, max 30" });
  });

  // Назва дати — не з матриці: вона живе в `my_dates` людини. Без ідентичності
  // її просто немає, і таблиця показує саму дату — порівняння не ламається.
  it("назва дати з `my_dates` їде поруч із матрицею", async () => {
    const res = await handleCompare(
      request("/api/mydate/compare", { dates: ["1980-03-03"] }, await signedInitData()),
      makeEnv([SYSTEM], [{ date: "1980-03-03", name: "Мама" }]),
    );
    const body = (await res.json()) as { names: Record<string, string> };

    expect(body.names).toEqual({ "1980-03-03": "Мама" });
  });

  it("без підписаного `initData` назв немає, а таблиця лишається", async () => {
    const res = await handleCompare(
      request("/api/mydate/compare", { dates: ["1980-03-03"] }),
      makeEnv([SYSTEM], [{ date: "1980-03-03", name: "Мама" }]),
    );
    const body = (await res.json()) as {
      names: Record<string, string>;
      matrix: Record<string, unknown>;
    };

    expect(res.status).toBe(200);
    expect(body.names).toEqual({});
    expect(Object.keys(body.matrix)).toEqual(["1980-03-03"]);
  });
});

/**
 * База зі **збереженим** аналізом дати: у знімку пояснень і трактувань немає,
 * тож видно саме те, чи дописує їх відповідь.
 */
function makeStoredEnv(): Env {
  const stored = JSON.stringify({
    western: { parameters: [{ key: "sunSign", label: "Знак Сонця", value: "Риби" }] },
  });
  const statement = {
    bind: () => statement,
    first: async () => ({ systems_data: stored }),
    all: async () => ({ results: [] }),
    run: async () => ({ meta: { changes: 1 } }),
  };
  return {
    DB: { prepare: () => statement } as unknown as D1Database,
    CONTENT_KV: { get: async () => null, put: async () => {} } as unknown as KVNamespace,
  } as unknown as Env;
}

describe("пояснення й трактування", () => {
  it("розрахунок віддає пояснення параметра й трактування значення", async () => {
    const res = await handleAnalyze(
      request("/api/mydate/analyze", { date: "1980-03-03", systemId: "western" }),
      makeEnv(),
    );
    const body = (await res.json()) as {
      result: { parameters: Array<{ key: string; about?: string; meaning?: string }> };
    };

    expect(res.status).toBe(200);
    expect(body.result.parameters.length).toBeGreaterThan(0);
    for (const parameter of body.result.parameters) {
      expect(parameter.about, `${parameter.key} без пояснення параметра`).toBeTruthy();
      expect(parameter.meaning, `${parameter.key} без трактування значення`).toBeTruthy();
    }
  });

  // Тексти потрібні таблиці двічі: пояснення — параметру, трактування —
  // значенню під своєю датою. Без них таблиця показувала б самі значення.
  it("аналіз віддає пояснення й трактування під тим самим ключем", async () => {
    const res = await handleCompare(
      request("/api/mydate/compare", { dates: ["1980-03-03"] }),
      makeEnv(),
    );
    const body = (await res.json()) as {
      matrix: Record<string, Record<string, Record<string, string>>>;
      details: Record<string, Record<string, Record<string, { about?: string; meaning?: string }>>>;
    };

    expect(res.status).toBe(200);
    const matrix = body.matrix["1980-03-03"].western;
    const details = body.details["1980-03-03"].western;
    expect(Object.keys(details)).toEqual(Object.keys(matrix));
    for (const key of Object.keys(matrix)) {
      expect(details[key].about, `${key} без пояснення параметра`).toBeTruthy();
      expect(details[key].meaning, `${key} без трактування значення`).toBeTruthy();
    }
  });

  // Знімок у D1 писали до появи довідника — саме тому тексти додаються
  // під час відповіді, а не при розрахунку.
  it("збережений аналіз теж дістає пояснення й трактування", async () => {
    const res = await handleAnalysisRead(
      new Request("https://api.example.com/api/mydate/analysis/1980-03-03"),
      makeStoredEnv(),
      "1980-03-03",
    );
    const body = (await res.json()) as {
      systems: Record<
        string,
        { parameters: Array<{ key: string; value: string; about?: string; meaning?: string }> }
      >;
    };

    expect(res.status).toBe(200);
    const parameter = body.systems.western.parameters[0];
    expect(parameter.value).toBe("Риби");
    expect(parameter.about).toBeTruthy();
    expect(parameter.meaning).toBeTruthy();
  });
});
