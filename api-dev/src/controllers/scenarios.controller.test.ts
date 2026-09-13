import { describe, it, expect } from "vitest";
import { HOME_SLUG } from "@wwwuabot/shared/content";
import { handleScenario } from "./scenarios.controller";
import type { Env } from "../shared/types";

/** Рядок сценарію у двійнику — ті колонки, які справді читає ендпоїнт. */
type ScenarioRow = Record<string, unknown>;

interface FakeState {
  /** Рядок, знайдений за `web_slug` або `codeword` (фільтр `is_active = 1`). */
  bySlug?: ScenarioRow | null;
  /** Рядок головної сторінки — відкат, коли за слагами нічого немає. */
  base?: ScenarioRow;
}

interface FakeStatement {
  bind: (...args: unknown[]) => FakeStatement;
  run: () => Promise<{ meta: { changes: number } }>;
  all: () => Promise<{ results: { name: string }[] }>;
  first: () => Promise<ScenarioRow | null>;
}

/**
 * Двійник D1 для одного ендпоїнта.
 *
 * Свідомо **не** мовчить: невідомий запит не повертає `null` тихо, а падає —
 * інакше тест проходив би з неправильної причини (саме так колись повівся
 * двійник у `services/sites/fake-db.ts`).
 *
 * `PRAGMA table_info` віддає повний список колонок, щоб `ensureTables` не
 * виконував `ALTER` на кожну оголошену колонку.
 */
function fakeD1(state: FakeState) {
  const columns = ["codeword", "web_slug", "title", "photo_url", "page_data", "is_active"];

  function builder(sql: string): FakeStatement {
    return {
      bind: () => builder(sql),
      run: async () => ({ meta: { changes: 1 } }),
      all: async () =>
        sql.startsWith("PRAGMA table_info")
          ? { results: columns.map((name) => ({ name })) }
          : { results: [] },
      first: async () => {
        // Пошук за адресою: слеші в `web_slug` зрізаються на читанні, бо
        // легасі-дані зберігали адресу і як `/pro-nas`, і як `pro-nas`.
        if (sql.includes("TRIM(COALESCE(web_slug")) return state.bySlug ?? null;
        if (sql.includes("WHERE codeword = ?")) return state.base ?? null;
        throw new Error(`Двійник D1 не знає запиту: ${sql}`);
      },
    };
  }

  return {
    prepare: (sql: string): FakeStatement => builder(sql.replace(/\s+/g, " ").trim()),
  };
}

const envWith = (state: FakeState): Env => ({ DB: fakeD1(state) }) as unknown as Env;

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

/** Форма відповіді ендпоїнта — саме те, що читає платформа. */
interface ScenarioResponse {
  ok: boolean;
  scenario: {
    /** Одна адреса: і шлях вебу, і основа діплінка. */
    slug: string;
    title: string | null;
    photo_url: string | null;
  };
  pageData: {
    version: number;
    zones: Record<
      string,
      { id: string; type: string; order: number; props: Record<string, unknown> }[]
    >;
  } | null;
}

const call = (env: Env, slug: string) =>
  handleScenario(new Request(`https://api.example.com/api/scenario/${slug}`), env, slug);

/** `res.json()` у TypeScript має тип `unknown` — звужуємо до контракту ендпоїнта. */
async function bodyOf(res: Response): Promise<ScenarioResponse> {
  return (await res.json()) as ScenarioResponse;
}

describe("GET /api/scenario/:slug", () => {
  it("віддає сторінку за слагами разом із метаданими", async () => {
    const env = envWith({
      bySlug: {
        codeword: "about",
        web_slug: "pro-nas",
        title: "Про нас",
        photo_url: "https://example.com/a.jpg",
        page_data: pageData("Про нас"),
        is_active: 1,
      },
    });

    const body = await bodyOf(await call(env, "pro-nas"));

    expect(body.ok).toBe(true);
    // Адреса = `web_slug`; `codeword` ("about") лишається лише легасі-ключем.
    expect(body.scenario.slug).toBe("pro-nas");
    expect(body.pageData?.zones.main[0]?.props.title).toBe("Про нас");
    // Регресія: `title` і `photo_url` не вибирались із бази, хоч клієнт їх
    // читав — у блоках ці поля завжди були порожні, і ніщо про це не казало.
    expect(body.scenario.title).toBe("Про нас");
    expect(body.scenario.photo_url).toBe("https://example.com/a.jpg");
  });

  it("невідомий шлях відкриває головну сторінку", async () => {
    const env = envWith({
      bySlug: null,
      base: {
        codeword: "__base__",
        web_slug: "/",
        title: "Головна",
        page_data: pageData("Головна"),
      },
    });

    const body = await bodyOf(await call(env, "нема-такої"));

    // У базі головна має порожній `slug`; `__base__` — це ключ маршруту.
    expect(body.scenario.slug).toBe(HOME_SLUG);
    expect(body.pageData?.zones.main[0]?.props.title).toBe("Головна");
  });

  it("легасі-ключ діплінка знаходить сторінку, але віддає її адресу", async () => {
    const env = envWith({
      bySlug: {
        codeword: "about",
        web_slug: "/pro-nas",
        title: "Про нас",
        page_data: pageData("Про нас"),
        is_active: 1,
      },
    });

    // Старе посилання `?start=about` мусить працювати далі, але відповідь уже
    // говорить мовою однієї адреси — інакше два імені жили б у клієнтах.
    const body = await bodyOf(await call(env, "about"));

    expect(body.scenario.slug).toBe("pro-nas");
  });

  it("битий page_data не пробиває помилку назовні", async () => {
    const env = envWith({
      bySlug: { codeword: "broken", web_slug: "broken", page_data: "{це не json", is_active: 1 },
    });

    const res = await call(env, "broken");
    const body = await bodyOf(res);

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.pageData).toBeNull();
  });

  it("розбирає легасі-формат slots — той самий код, що в бота й оболонок", async () => {
    const env = envWith({
      bySlug: {
        codeword: "legacy",
        web_slug: "legacy",
        page_data: JSON.stringify({
          v: 1,
          slots: { main: [{ component: "Heading", props: { text: "Стара" } }] },
        }),
        is_active: 1,
      },
    });

    const body = await bodyOf(await call(env, "legacy"));

    expect(body.pageData?.zones.main[0]?.type).toBe("text");
    expect(body.pageData?.zones.main[0]?.props.title).toBe("Стара");
  });
});
