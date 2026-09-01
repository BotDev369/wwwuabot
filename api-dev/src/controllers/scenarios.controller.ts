import type { Env } from "../shared/types";
import { BASE_CONFIG } from "../shared/constants";
import { apiLog } from "../shared/logger";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── ensureBase ──────────────────────────────────────────────────────

async function ensureBase(db: D1Database): Promise<void> {
  const tableCheck = await db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='scenarios'")
    .first();

  if (!tableCheck) {
    await db.exec(`
      CREATE TABLE scenarios (
        codeword TEXT PRIMARY KEY,
        photo_url TEXT,
        caption_top TEXT,
        caption_mid TEXT,
        caption_bot TEXT,
        keyboard_type TEXT NOT NULL DEFAULT 'static',
        buttons TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        price TEXT,
        qty_options TEXT,
        awaits_input TEXT,
        input_path TEXT,
        input_next TEXT,
        title TEXT,
        notify_groups TEXT,
        notify_template TEXT,
        rich_message TEXT,
        rich_data TEXT,
        page_data TEXT DEFAULT NULL,
        web_config TEXT DEFAULT NULL,
        web_slug TEXT DEFAULT NULL,
        is_active INTEGER DEFAULT 1
      );
    `);
  }

  await db
    .prepare(
      `INSERT OR IGNORE INTO scenarios (codeword, web_slug, web_config, is_active)
       VALUES ('__base__', '/', ?, 1)`,
    )
    .bind(JSON.stringify(BASE_CONFIG))
    .run();
}

// ── resolveScenario ─────────────────────────────────────────────────

async function resolveScenario(db: D1Database, slug: string) {
  await ensureBase(db);

  let row: any = null;
  if (slug && slug !== "__base__") {
    row = await db
      .prepare(
        `SELECT codeword, web_slug, web_config, page_data FROM scenarios
         WHERE (web_slug = ? OR codeword = ?) AND is_active = 1
         LIMIT 1`,
      )
      .bind(slug, slug)
      .first();
  }

  if (!row) {
    row = await db
      .prepare(`SELECT codeword, web_slug, web_config, page_data FROM scenarios WHERE codeword = '__base__'`)
      .first();
  }

  // page_data (new Page Builder format) має пріоритет над web_config
  let config = BASE_CONFIG;
  let pageData: Record<string, unknown> | null = null;

  // Спочатку перевіряємо page_data (новий формат)
  try {
    if (row?.page_data) {
      const parsed = JSON.parse(row.page_data);
      if (parsed?.zones && parsed?.version) {
        pageData = parsed;
      }
    }
  } catch (e) {
    apiLog.error("Invalid page_data JSON for " + slug, e);
  }

  // Якщо page_data немає — використовуємо web_config (старий формат)
  if (!pageData) {
    try {
      if (row?.web_config) {
        const parsed = JSON.parse(row.web_config);
        if (parsed?.v === 1) config = parsed;
      }
    } catch (e) {
      apiLog.error("Invalid web_config JSON for " + slug, e);
    }
  }

  return {
    scenario: {
      codeword: row?.codeword ?? "__base__",
      web_slug: row?.web_slug ?? "/",
    },
    config,
    pageData,
  };
}

// ── GET /api/scenario/:slug ─────────────────────────────────────────

export async function handleScenario(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  try {
    const { scenario, config, pageData } = await resolveScenario(env.DB, slug);
    return json({
      ok: true,
      scenario,
      config,
      pageData,
      userContext: { authenticated: false, roles: [], flags: [] },
    });
  } catch (e: any) {
    apiLog.error("Scenario error", e);
    return json({ ok: false, error: e?.message ?? "Unknown error" }, 500);
  }
}
