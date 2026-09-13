import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import {
  HOME_SLUG,
  LEGACY_HOME_KEY,
  contentPageFromScenario,
  normalizeSlug,
  type ScenarioContentRow,
} from "@wwwuabot/shared/content";
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
 *
 * `web_slug` тут лишається легасі-значенням: у новій моделі адреса головної —
 * порожній `slug`, а `__base__` — це ключ діплінка, тобто `LEGACY_HOME_KEY`.
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

/**
 * Колонки, потрібні, щоб віддати сторінку: контент **і його метадані**.
 *
 * `title` і `photo_url` раніше не вибирались, хоч клієнт їх читав: у блоках
 * `context.title` і `context.photoUrl` завжди були `null`. Виявити це було ні
 * чим — обидві сторони мовчали.
 *
 * `web_slug` і `codeword` — **легасі-колонки**: доки читач ходить у `scenarios`
 * (фаза 3 переведе його на `pages`), з них зводиться одна адреса. Див.
 * `contentPageFromScenario`.
 */
const PAGE_COLUMNS = "codeword, web_slug, title, photo_url, page_data, is_active";

// ── resolveScenario ─────────────────────────────────────────────────
async function resolveScenario(db: D1Database, ref: string) {
  await ensureBase(db);

  // Адреса приходить із URL, тому спершу канонізується: провідні слеші, query,
  // легасі-ключ головної (`__base__` у маршруті = порожній `slug` у базі).
  const slug = normalizeSlug(ref);

  let row: ScenarioContentRow | null = null;
  if (slug !== HOME_SLUG) {
    row = await db
      .prepare(
        `SELECT ${PAGE_COLUMNS} FROM scenarios
         WHERE (TRIM(COALESCE(web_slug, ''), '/') = ? OR codeword = ?) AND is_active = 1
         LIMIT 1`,
      )
      .bind(slug, slug)
      .first<ScenarioContentRow>();
  }

  if (!row) {
    row = await db
      .prepare(`SELECT ${PAGE_COLUMNS} FROM scenarios WHERE codeword = ? LIMIT 1`)
      .bind(LEGACY_HOME_KEY)
      .first<ScenarioContentRow>();
  }

  // Розбір `page_data` — спільний із ботом і обома оболонками
  // (`@wwwuabot/shared/content`), включно з легасі-форматом `slots`.
  const page = row ? contentPageFromScenario(row, "scenarios") : null;
  if (row?.page_data && !page?.content) {
    // Друге поле — той самий «error»-аргумент логера; тут це ключ сторінки, бо
    // винятку немає: парсер ковтає битий JSON навмисно.
    apiLog.error("scenarios: page_data не є конфігурацією сторінки", row.codeword);
  }

  return {
    scenario: {
      // Одна адреса: з неї клієнт будує і шлях, і діплінк (`toWebPath` /
      // `toBotPayload`). Раніше тут було дві назви — `codeword` і `web_slug` —
      // і саме через це «яка сторінка відповідає цьому URL» існувало в
      // чотирьох різних реалізаціях.
      slug: page?.slug ?? HOME_SLUG,
      title: page?.title ?? null,
      photo_url: page?.photoUrl ?? null,
    },
    pageData: page?.content ?? null,
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
