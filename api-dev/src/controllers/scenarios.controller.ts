import type { Env } from "../shared/types";
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
export async function handleScenario(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  try {
    const { scenario, pageData } = await resolveScenario(env.DB, slug);
    return json({
      ok: true,
      scenario,
      pageData,
      userContext: { authenticated: false, roles: [], flags: [] },
    });
  } catch (e: unknown) {
    apiLog.error("Scenario error", e);
    const msg = e instanceof Error ? e.message : String(e);
    return json({ ok: false, error: msg }, 500);
  }
}
