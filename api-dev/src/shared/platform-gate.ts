/**
 * Гейт допуску — перед маршрутизацією, у одному місці.
 *
 * **Чому не в кожному контролері.** Продукт закритий за запрошеннями, а входів
 * у нього два: чат і вебплатформа. Коли правило живе в чаті, посилання з
 * кнопки «Відкрити сторінку» веде повз нього — і людина, якій відмовили в боті,
 * просто відкриває Mini App. Один гейт перед роутером означає ще й те, що
 * **новий ендпоїнт за замовчуванням закритий**: щоб зробити його відкритим,
 * треба дізнатися про `PLATFORM_EXEMPT_PATHS`.
 *
 * **Правило спільне з ботом** (`@wwwuabot/shared/security/access`): обидва
 * входи дивляться в одне поле `users.inviter_id`, тож «хто запросив» не має двох
 * правд.
 *
 * @module api-dev/src/shared/platform-gate
 */

import type { Env } from "./types";
import { hasAccess } from "@wwwuabot/shared/security/access";
import { resolveUserId } from "./identity";
import { isAuthenticated } from "../controllers/auth.controller";
import { apiLog } from "./logger";

/** Префікси адмін-гейту: ними керує cookie-сесія, а не допуск. */
const ADMIN_PATH_PREFIXES = ["/api/admin/", "/api/portal/", "/api/bot/"] as const;

/**
 * Шляхи під `/api/`, які **не** закриті гейтом допуску.
 *
 * Кожен рядок має причину бути відкритим, і новий без причини — це діра:
 *
 * - `/api/user/access` — сам запит «чи є в мене доступ»
 *   (`controllers/access.controller.ts`): гейт не може закривати себе;
 * - `/api/user/access-request` — повідомлення, написане зі сторінки відмови
 *   (`access-request.controller.ts`). Воно поза гейтом, бо допуску ще немає, —
 *   інакше відмова була б стіною без виходу; підпис `initData` при цьому
 *   обов'язковий (401), тож рядок завжди має власника;
 * - `/api/shop/media/` — файли магазину. Вони читаються тегом `<img>`, а браузер
 *   не може додати до такого запиту заголовок із `initData`, тож вимога підпису
 *   зробила б картинки невидимими (див. `docs/SHOPS.md` §5);
 * - `/api/messages/media/` — файли листування, **та сама причина** в третій
 *   поверхні: знімок у бульбашці теж береться тегом `<img>`. Слеш у кінці
 *   важливий — він відкриває лише читання байтів, а саме завантаження
 *   (`POST /api/messages/media`) лишається закритим і підписаним;
 * - `/api/public/redirect` — куди веде стара адреса сторінки. Питає **воркер
 *   вебу**, у якого немає ні бази, ні `initData` людини: відкриття старого
 *   посилання не має залежати від того, чи браузер уже в контексті Telegram.
 *   У відповіді — лише шлях; чи сторінка існує і чи вона публічна, вирішує
 *   `handleScenario` зі своїм гейтом.
 */
export const PLATFORM_EXEMPT_PATHS = [
  "/api/user/access",
  "/api/user/access-request",
  "/api/shop/media/",
  "/api/messages/media/",
  "/api/public/redirect",
] as const;

function denied(): Response {
  return new Response(JSON.stringify({ error: "За запрошенням" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

/** Чи вимагає цей шлях допуску. */
function needsAccess(pathname: string): boolean {
  if (!pathname.startsWith("/api/")) return false;
  if (ADMIN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return false;
  return !PLATFORM_EXEMPT_PATHS.some((prefix) => pathname.startsWith(prefix));
}

/** Скільки живе дозвіл у пам'яті інстансу. */
const ACCESS_TTL_MS = 15_000;

/** Стеля на інстанс: людей мало, але кеш не мусить рости безкінечно. */
const ACCESS_CACHE_LIMIT = 1_000;

/** Дозволи, які вже перевірили, — окремо для кожної бази інстансу. */
const accessCache = new WeakMap<D1Database, Map<number, number>>();

function accessCacheFor(db: D1Database): Map<number, number> {
  const existing = accessCache.get(db);
  if (existing) return existing;
  const created = new Map<number, number>();
  accessCache.set(db, created);
  return created;
}

/**
 * Чи можу віддати запит далі.
 *
 * `null` — можна. `Response` — не можна: 401 (немає підпису) або 403 (людина не
 * запрошена).
 *
 * **Дозвіл запам'ятовується на 15 с, відмова — ніколи.** `inviter_id` пише бот у
 * момент переходу за лінком, тож «ні» завжди читається з таблиці: людину, яку
 * щойно запросили, гейт має пустити зразу. «Так» може прийти з пам'яті
 * інстансу — ключ кешу — сам `env.DB`, і живе він рівно стільки, скільки живе
 * інстанс.
 *
 * Власник (`ADMIN_TELEGRAM_ID`) проходить без `inviter_id`: йому нема ким бути
 * запрошеним.
 */
async function hasAccessToPlatform(
  request: Request,
  env: Env,
): Promise<{ ok: true } | { ok: false; response: Response }> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return { ok: false, response: identity.response };

  const cache = accessCacheFor(env.DB);
  const now = Date.now();
  const expiresAt = cache.get(identity.userId);
  if (expiresAt !== undefined && expiresAt > now) return { ok: true };

  try {
    const row = await env.DB.prepare("SELECT user_id, inviter_id FROM users WHERE user_id = ?")
      .bind(identity.userId)
      .first<{ user_id: number; inviter_id: number | null }>();
    if (hasAccess(row, env.ADMIN_TELEGRAM_ID)) {
      if (cache.size >= ACCESS_CACHE_LIMIT) cache.clear();
      cache.set(identity.userId, now + ACCESS_TTL_MS);
      return { ok: true };
    }
  } catch (error: unknown) {
    // База недоступна — це не привід відкрити продукт: закритий продукт
    // лишається закритим, доки не зможемо перевірити.
    apiLog.error("access check failed", error);
  }

  return { ok: false, response: denied() };
}

/**
 * Точка входу гейту для роутера: `Response` — відмова, `null` — проходи далі.
 *
 * **Виняток один — валідна admin-сесія.** Не зручності заради: панель
 * рендерить ті самі блоки сторінок (`ScenarioPreview` → `PageRenderer`), тож
 * власник дивиться прев'ю з cookie, а не з `initData`. Сесія — пароль власника,
 * тож вона не є «черговим відкритим входом» і нічого не дає людині з
 * посилання.
 */
export async function enforcePlatformAccess(
  request: Request,
  env: Env,
  pathname: string,
): Promise<Response | null> {
  if (!needsAccess(pathname)) return null;
  if (await isAuthenticated(request, env)) return null;

  const access = await hasAccessToPlatform(request, env);
  return access.ok ? null : access.response;
}
