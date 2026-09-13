import { ensureTables } from "@wwwuabot/shared/database/tables";
import type { Env } from "../shared/types";
import { apiLog } from "../shared/logger";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── ensureBase ──────────────────────────────────────────────────────
/**
 * Гарантує наявність таблиці `scenarios` і базового сценарію `__base__`.
 *
 * DDL більше не живе тут: схема оголошена в реєстрі
 * (`@wwwuabot/shared/database/tables`), як і всі інші таблиці. Раніше цей
 * контролер створював `scenarios` **без** `IF NOT EXISTS` і за неатомною
 * перевіркою `sqlite_master` — тобто двоє одночасних запитів на чистій базі
 * могли отримати помилку «table already exists».
 */
async function ensureBase(db: D1Database): Promise<void> {
  await ensureTables(db, ["scenarios"]);

  await db
    .prepare(
      `INSERT OR IGNORE INTO scenarios (codeword, web_slug, is_active)
       VALUES ('__base__', '/', 1)`,
    )
    .run();
}

// ── resolveScenario ─────────────────────────────────────────────────
interface ScenarioDbRow {
  codeword?: string;
  web_slug?: string;
  page_data?: string | null;
  [key: string]: unknown;
}

async function resolveScenario(db: D1Database, slug: string) {
  await ensureBase(db);

  let row: ScenarioDbRow | null = null;
  if (slug && slug !== "__base__") {
    row = await db
      .prepare(
        `SELECT codeword, web_slug, page_data FROM scenarios
         WHERE (web_slug = ? OR codeword = ?) AND is_active = 1
         LIMIT 1`,
      )
      .bind(slug, slug)
      .first<ScenarioDbRow>();
  }

  if (!row) {
    row = await db
      .prepare(`SELECT codeword, web_slug, page_data FROM scenarios WHERE codeword = '__base__'`)
      .first<ScenarioDbRow>();
  }

  let pageData: Record<string, unknown> | null = null;
  try {
    if (row?.page_data) {
      pageData = JSON.parse(row.page_data);
    }
  } catch (e) {
    apiLog.error("Invalid page_data JSON for " + slug, e);
  }

  return {
    scenario: {
      codeword: row?.codeword ?? "__base__",
      web_slug: row?.web_slug ?? "/",
    },
    pageData,
  };
}

// ── GET /api/scenario/:slug ─────────────────────────────────────────
export async function handleScenario(request: Request, env: Env, slug: string): Promise<Response> {
  try {
    const { scenario, pageData } = await resolveScenario(env.DB, slug);
    return json({
      ok: true,
      scenario,
      pageData,
      userContext: { authenticated: false, roles: [], flags: [] },
    });
  } catch (e: unknown) {
    // Це **публічний** ендпоїнт (без авторизації), тому текст винятку
    // назовні не йде: у ньому бувають назви таблиць і значення з D1.
    // Клієнту достатньо `ok: false` — він і так показує фолбек-сторінку;
    // деталі йдуть у Workers Logs і Sentry.
    apiLog.error("Scenario error", e);
    return json({ ok: false, error: "Internal error" }, 500);
  }
}
