import { describe, it, expect } from "vitest";
import { HOME_SLUG } from "@wwwuabot/shared/content";
import { handleScenario } from "./scenarios.controller";
import type { Env } from "../shared/types";

type ScenarioRow = Record<string, unknown>;
interface FakeState {
  rows: ScenarioRow[];
}
interface FakeStatement {
  bind: (...args: unknown[]) => FakeStatement;
  run: () => Promise<{ meta: { changes: number } }>;
  all: () => Promise<{ results: ScenarioRow[] }>;
}

function fakeD1(state: FakeState): D1Database {
  const columns = ["id", "slug", "title", "photo_url", "page_data", "is_active"];
  const db = {
    prepare(sql: string) {
      const statement: FakeStatement = {
        bind: () => statement,
        run: async () => ({ meta: { changes: 1 } }),
        all: async () =>
          sql.startsWith("PRAGMA table_info")
            ? { results: columns.map((name) => ({ name })) }
            : { results: state.rows },
      };
      return statement;
    },
  };
  return db as unknown as D1Database;
}

const envWith = (rows: ScenarioRow[]): Env => ({ DB: fakeD1({ rows }) }) as unknown as Env;

const pageData = (title: string) =>
  JSON.stringify({
    version: 1,
    zones: {
      sidebar: [],
      header: [],
      main: [{ id: "b1", type: "text", order: 0, props: { title } }],
      footer: [],
    },
  });

interface ScenarioResponse {
  ok: boolean;
  scenario: { slug: string; title: string | null; photo_url: string | null };
  pageData: {
    zones: Record<string, Array<{ type: string; props: Record<string, unknown> }>>;
  } | null;
}

async function bodyOf(response: Response): Promise<ScenarioResponse> {
  return (await response.json()) as ScenarioResponse;
}

const call = (env: Env, slug: string) =>
  handleScenario(new Request(`https://api.example.com/api/scenario/${slug}`), env, slug);

describe("GET /api/scenario/:slug", () => {
  it("віддає сторінку за canonical slug разом із метаданими", async () => {
    const body = await bodyOf(
      await call(
        envWith([
          {
            slug: "pro-nas",
            title: "Про нас",
            photo_url: "https://example.com/a.jpg",
            page_data: pageData("Про нас"),
            is_active: 1,
          },
        ]),
        "pro-nas",
      ),
    );

    expect(body.ok).toBe(true);
    expect(body.scenario.slug).toBe("pro-nas");
    expect(body.scenario.title).toBe("Про нас");
    expect(body.scenario.photo_url).toBe("https://example.com/a.jpg");
    expect(body.pageData?.zones.main[0]?.props.title).toBe("Про нас");
  });

  it("невідомий шлях відкатується на домашню сторінку", async () => {
    const body = await bodyOf(
      await call(
        envWith([
          { slug: "", title: "Головна", page_data: pageData("Головна"), is_active: 1 },
          { slug: "about", title: "Про нас", page_data: pageData("Про нас"), is_active: 1 },
        ]),
        "нема-такої",
      ),
    );

    expect(body.scenario.slug).toBe(HOME_SLUG);
    expect(body.pageData?.zones.main[0]?.props.title).toBe("Головна");
  });

  it("підтримує найдовший збіг slug для параметрів URL", async () => {
    const body = await bodyOf(
      await call(
        envWith([
          { slug: "mydate", page_data: pageData("Дата"), is_active: 1 },
          { slug: "mydate/today", page_data: pageData("Сьогодні"), is_active: 1 },
        ]),
        "mydate/today/details",
      ),
    );

    expect(body.scenario.slug).toBe("mydate/today");
    expect(body.pageData?.zones.main[0]?.props.title).toBe("Сьогодні");
  });

  it("битий page_data не пробиває помилку назовні", async () => {
    const res = await call(
      envWith([{ slug: "broken", page_data: "{це не json", is_active: 1 }]),
      "broken",
    );
    const body = await bodyOf(res);

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.pageData).toBeNull();
  });

  it("розбирає legacy slots тим самим shared-адаптером", async () => {
    const body = await bodyOf(
      await call(
        envWith([
          {
            slug: "legacy",
            page_data: JSON.stringify({
              v: 1,
              slots: { main: [{ component: "Heading", props: { text: "Стара" } }] },
            }),
            is_active: 1,
          },
        ]),
        "legacy",
      ),
    );

    expect(body.pageData?.zones.main[0]?.type).toBe("text");
    expect(body.pageData?.zones.main[0]?.props.title).toBe("Стара");
  });
});
