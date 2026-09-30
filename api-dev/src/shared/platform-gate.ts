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
 * - `/api/shop/media/` — файли магазину. Вони читаються тегом `<img>`, а браузер
 *   не може додати до такого запиту заголовок із `initData`, тож вимога підпису
 *   зробила б картинки невидимими (див. `docs/SHOPS.md` §5).
 */
export const PLATFORM_EXEMPT_PATHS = ["/api/user/access", "/api/shop/media/"] as const;

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

/**
 * Чи можу віддати запит далі.
 *
 * `null` — можна. `Response` — не можна: 401 (немає підпису) або 403 (людина не
 * запрошена).
 *
 * **Рядок читається з таблиці `users`**, а не з кешу: `inviter_id` пише бот у
 * момент переходу за лінком, і людина, яка щойно прийшла, має отримати доступ
 * без перезавантаження Mini App.
 */
async function hasAccessToPlatform(
  request: Request,
  env: Env,
): Promise<{ ok: true } | { ok: false; response: Response }> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return { ok: false, response: identity.response };

  try {
    const row = await env.DB.prepare("SELECT inviter_id FROM users WHERE user_id = ?")
      .bind(identity.userId)
      .first<{ inviter_id: number | null }>();
    if (hasAccess(row)) return { ok: true };
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
