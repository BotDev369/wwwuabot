import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import {
  HOME_SLUG,
  contentPageFromScenario,
  type ContentPage,
  normalizeSlug,
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
 * Гарантує наявність таблиці `platform_pages`.
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
  await ensureTables(db, ["platform_pages"]);
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

/**
 * Скільки сегментів адреси взагалі має сенс питати в базі.
 *
 * Довша адреса — це вже параметри маршруту (дата, сторінка списку), а не шлях
 * у сховищі. Обмеження тримає запит у межах кількох `?`, навіть якщо клієнт
 * приніс шлях із сотнею сегментів.
 */
const MAX_ROUTE_SEGMENTS = 8;

/**
 * Адреси-кандидати для цього шляху: сам шлях і всі його префікси.
 *
 * Сторінка з параметрами (`dateanalysis/1980-03-03/today`) у базі лежить як
 * `dateanalysis`, тобто рядок, чия адреса є префіксом запиту. Тому кандидатів
 * рівно стільки, скільки сегментів, а не скільки сторінок у базі.
 */
function routeCandidates(slug: string): string[] {
  if (slug === HOME_SLUG) return [HOME_SLUG];
  const segments = slug.split("/");
  const depth = Math.min(segments.length, MAX_ROUTE_SEGMENTS);
  const candidates: string[] = [];
  for (let length = depth; length > 0; length -= 1) {
    candidates.push(segments.slice(0, length).join("/"));
  }
  return candidates;
}

/**
 * Рядки `scenarios` за цими адресами, які бачить цей глядач.
 *
 * Видимість відбирає код, а не SQL: контент платформи (`owner_id` порожній)
 * відкритий, сторінка людини — коли публічна або коли цю людину додано
 * глядачем. Точну умову ухвалює `pageVisibleTo`: `viewer_ids` — JSON-колонка, і
 * SQL не знає, чи збігся id, чи це підрядок чужого.
 */
async function visiblePages(
  db: D1Database,
  slugs: readonly string[],
  viewerId: number | null,
): Promise<ContentPage[]> {
  if (slugs.length === 0) return [];
  const placeholders = slugs.map(() => "?").join(", ");
  const rows = await db
    .prepare(
      `SELECT ${PAGE_COLUMNS} FROM platform_pages WHERE is_active = 1 AND slug IN (${placeholders})`,
    )
    .bind(...slugs)
    .all<GatedScenarioRow>();
  return ((rows.results ?? []) as GatedScenarioRow[])
    .filter((row) =>
      pageVisibleTo(
        row.owner_id ?? null,
        row.is_public === 1,
        pageViewerIds(row.viewer_ids),
        viewerId,
      ),
    )
    .map(contentPageFromScenario);
}

/** Головна сторінка, якщо вона є й видима цьому глядачу. */
async function homePage(db: D1Database, viewerId: number | null): Promise<ContentPage | null> {
  const pages = await visiblePages(db, [HOME_SLUG], viewerId);
  return pages[0] ?? null;
}

/**
 * Сторінка, на яку вказує alias старої адреси; немає — `null`.
 *
 * Читається **лише коли** пряма адреса нікуди не веде: зайвий запит на кожен
 * перехід сторінки, яка нікуди не переїжджала, не потрібен.
 */
async function movedPage(
  db: D1Database,
  slug: string,
  viewerId: number | null,
): Promise<ContentPage | null> {
  const target = await redirectTargetFor(db, slug);
  if (target === null) return null;
  const pages = await visiblePages(db, [normalizeSlug(target)], viewerId);
  return pages[0] ?? null;
}

// ── resolveScenario ─────────────────────────────────────────────────
async function resolveScenario(db: D1Database, ref: string, viewerId: number | null) {
  await ensureBase(db);

  const slug = normalizeSlug(ref);

  // Спершу — сама адреса та її префікси. Раніше тут читались **усі** активні
  // сторінки (28 рядків, ≈148 КБ `page_data`) і кожен рядок розбирався в JSON,
  // щоб знайти один. Адреса унікальна (`slug UNIQUE`), тож пошук за нею — це
  // один рядок за індексом.
  const pages = await visiblePages(db, routeCandidates(slug), viewerId);
  let page = resolveContentRoute(pages, slug)?.page ?? null;

  if (page === null && slug !== HOME_SLUG) {
    // Стара адреса веде на сторінку, яка переїхала (`docs/URL.md` §4): інакше
    // кнопка, надіслана в чат до переїзду, показувала б фолбек замість статті.
    // А далі — фолбек на головну, і теж окремим запитом: глибока сторінка не
    // мусить тягнути `page_data` головної лише тому, що та існує.
    page = (await movedPage(db, slug, viewerId)) ?? (await homePage(db, viewerId));
  }

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
