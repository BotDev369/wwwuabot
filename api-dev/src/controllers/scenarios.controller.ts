import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import {
  HOME_SLUG,
  contentPageFromScenario,
  type ContentPage,
  normalizeSlug,
  pickContentPage,
  resolveContentRoute,
  type ScenarioContentRow,
} from "@wwwuabot/shared/content";
import { pageViewerIds, pageVisibleTo } from "@wwwuabot/shared/pages";
import type { Env } from "../shared/types";
import { apiLog } from "../shared/logger";
import { tryResolveUserId } from "../shared/identity";
import { redirectTargetFor } from "../services/aliases.service";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── ensureBase ──────────────────────────────────────────────────────
/**
 * Гарантує наявність таблиці `scenarios`.
 *
 * DDL живе в реєстрі (`@wwwuabot/shared/database/tables`), не тут.
 *
 * **Порожнього рядка-домашньої сторінки більше немає.** Раніше цей шлях
 * створював рядок із `slug = ''`, і той самий рядок ставав «сторінкою без
 * шаблону»: без назви, без `page_data` і без `template_key`, яку ніхто не
 * створював і ніхто не бачив. Корінь продукту — екран акаунта, а не рядок
 * контенту; невідома адреса й так показує фолбек. Правило: **сторінка без
 * шаблону не існує** (`docs/PAGES.md` §7).
 */
async function ensureBase(db: D1Database): Promise<void> {
  await ensureTables(db, ["scenarios"]);
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
const PAGE_COLUMNS =
  "id, slug, title, photo_url, page_data, template_key, is_active, owner_id, is_public, viewer_ids";

/** Рядок з колонками видимості: рішення ухвалює `pageVisibleTo`, а не SQL. */
interface GatedScenarioRow extends ScenarioContentRow {
  owner_id?: number | null;
  is_public?: number | null;
  viewer_ids?: string | null;
}

/** Сторінка, на яку вказує alias старої адреси; немає — `null`. */
async function movedPage(
  pages: readonly ContentPage[],
  db: D1Database,
  slug: string,
): Promise<ContentPage | null> {
  const target = await redirectTargetFor(db, slug);
  return target === null ? null : (resolveContentRoute(pages, target)?.page ?? null);
}

// ── resolveScenario ─────────────────────────────────────────────────
async function resolveScenario(db: D1Database, ref: string, viewerId: number | null) {
  await ensureBase(db);

  const slug = normalizeSlug(ref);

  // Видимість відбирає запит, а не розмітка: контент платформи (`owner_id`
  // порожній) відкритий, сторінка людини — коли публічна або коли цю людину
  // додано глядачем. Точну умову ухвалює `pageVisibleTo`: `viewer_ids` —
  // JSON-колонка, і SQL не знає, чи збігся id, чи це підрядок чужого.
  // `COALESCE` — бо колонку додано наявній таблиці й у старих рядків там `NULL`.
  const rows = await db
    .prepare(
      `SELECT ${PAGE_COLUMNS} FROM scenarios
       WHERE is_active = 1
         AND (owner_id IS NULL OR COALESCE(is_public, 0) = 1
              OR (owner_id IS NOT NULL AND viewer_ids IS NOT NULL))`,
    )
    .all<GatedScenarioRow>();
  const pages = ((rows.results ?? []) as GatedScenarioRow[])
    .filter((row) =>
      pageVisibleTo(
        row.owner_id ?? null,
        row.is_public === 1,
        pageViewerIds(row.viewer_ids),
        viewerId,
      ),
    )
    .map(contentPageFromScenario);

  // Стара адреса веде на сторінку, яка переїхала (`docs/URL.md` §4): інакше
  // кнопка, надіслана в чат до переїзду, показувала б фолбек замість статті.
  const direct = resolveContentRoute(pages, slug)?.page ?? null;
  const page = direct ?? (await movedPage(pages, db, slug)) ?? pickContentPage(pages, slug);

  return {
    scenario: {
      // Одна адреса: з неї клієнт будує і шлях, і діплінк (`toWebPath` /
      // `toBotPayload`).
      id: page?.id ?? null,
      slug: page?.slug ?? HOME_SLUG,
      title: page?.title ?? null,
      photo_url: page?.photoUrl ?? null,
      // Шаблон сторінки: за ним клієнт знає, що під вітриною стоїть каталог
      // магазину й його треба спитати окремо (`docs/SHOPS.md` §2).
      template_key: page?.templateKey ?? null,
    },
    pageData: page?.content ?? null,
  };
}

// ── GET /api/scenario/:slug ─────────────────────────────────────────
export async function handleScenario(request: Request, env: Env, slug: string): Promise<Response> {
  try {
    const viewerId = await tryResolveUserId(request, env);
    const { scenario, pageData } = await resolveScenario(env.DB, slug, viewerId);
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
