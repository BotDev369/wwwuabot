import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import {
  HOME_SLUG,
  contentPageFromScenario,
  normalizeSlug,
  pickContentPage,
  resolveContentRoute,
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
 * Гарантує наявність таблиці `scenarios` і домашньої сторінки (порожній `slug`).
 *
 * DDL більше не живе тут: схема оголошена в реєстрі
 * (`@wwwuabot/shared/database/tables`), як і всі інші таблиці. Раніше цей
 * контролер створював `scenarios` **без** `IF NOT EXISTS` і за неатомною
 * перевіркою `sqlite_master` — тобто двоє одночасних запитів на чистій базі
 * могли отримати помилку «table already exists».
 *
 * `slug` — єдина адреса сторінки: за нею рядок шукають, її ж віддаємо
 * клієнту. `id` — номер рядка: адресу редагують, а номер лишається тим самим.
 */
async function ensureBase(db: D1Database): Promise<void> {
  await ensureTables(db, ["scenarios"]);

  await db
    .prepare(
      `INSERT OR IGNORE INTO scenarios (slug, is_active)
       VALUES ('', 1)`,
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
 * `slug` — єдина адреса сторінки, яку повертаємо клієнту; `id` — номер рядка,
 * за яким адресу можна відрізнити після редагування.
 */
const PAGE_COLUMNS = "id, slug, title, photo_url, page_data, is_active";

// ── resolveScenario ─────────────────────────────────────────────────
async function resolveScenario(db: D1Database, ref: string) {
  await ensureBase(db);

  const slug = normalizeSlug(ref);

  // Друга умова — про сторінки, які створила людина: назовні видно лише ті,
  // що автор відкрив (`is_public = 1`). Контент платформи впізнається за
  // порожнім власником, тож він доступний як і раніше. Фільтр тут, у запиті,
  // а не в розмітці: інакше приватну сторінку дістали б прямим посиланням
  // (`docs/SPACE.md`). `COALESCE` — бо колонка додана наявній таблиці й у
  // старих рядків вона `NULL`, а не `0`.
  const rows = await db
    .prepare(
      `SELECT ${PAGE_COLUMNS} FROM scenarios
       WHERE is_active = 1
         AND (owner_id IS NULL OR COALESCE(is_public, 0) = 1)`,
    )
    .all<ScenarioContentRow>();
  const pages = (rows.results ?? []).map(contentPageFromScenario);
  const page = resolveContentRoute(pages, slug)?.page ?? pickContentPage(pages, slug);

  return {
    scenario: {
      // Одна адреса: з неї клієнт будує і шлях, і діплінк (`toWebPath` /
      // `toBotPayload`).
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
