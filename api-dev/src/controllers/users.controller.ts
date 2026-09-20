/**
 * Контролер CRUD для таблиці `users`.
 *
 * Декомпозовано: бізнес-логіка та D1-операції винесені в `UsersService`.
 * Контролер відповідає виключно за HTTP transport, парсинг параметрів та коди відповідей.
 *
 * Ендпоїнти:
 *   GET  /api/admin/users/list        — список (без важких JSON-колонок)
 *   POST /api/admin/users/read        — прочитати за user_id
 *   POST /api/admin/users/update      — оновити поля
 *   POST /api/admin/users/delete      — видалити
 *   POST /api/admin/users/block       — заблокувати/розблокувати
 *   POST /api/admin/users/bulk        — bulk delete/block/unblock
 *   POST /api/admin/users/message     — надіслати повідомлення через Telegram
 *   GET  /api/user/profile            — профіль для conditional rendering
 *   POST /api/user/username           — задати ім'я на платформі (сам користувач)
 */
import type { Env } from "../shared/types";
import { UsersService } from "../services/users.service";
import { UserProfileService } from "../services/user-profile.service";
import { resolveInitDataIdentity, resolveUserId } from "../shared/identity";

// ── Helpers ───────────────────────────────────────────────────────
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── Handlers ──────────────────────────────────────────────────────

/** GET /api/admin/users/list — список користувачів. */
export async function handleListUsers(_request: Request, env: Env): Promise<Response> {
  try {
    const service = new UsersService(env);
    const items = await service.listUsers();
    return json({ success: true, items });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
}

/** POST /api/admin/users/read — прочитати користувача. */
export async function handleReadUser(request: Request, env: Env): Promise<Response> {
  let body: { user_id?: number };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.user_id) {
    return json({ error: "user_id required" }, 400);
  }

  try {
    const service = new UsersService(env);
    const data = await service.readUser(body.user_id);
    return json({ success: true, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}

/** POST /api/admin/users/update — оновити поля користувача. */
export async function handleUpdateUser(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const userId =
    typeof body.user_id === "number" ? body.user_id : parseInt(String(body.user_id), 10);

  if (!userId || isNaN(userId)) {
    return json({ error: "user_id required" }, 400);
  }

  try {
    const service = new UsersService(env);
    await service.updateUser(userId, body);
    return json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg === "no fields to update" ? 400 : 500;
    return json({ error: msg }, status);
  }
}

/** POST /api/admin/users/delete — видалити користувача. */
export async function handleDeleteUser(request: Request, env: Env): Promise<Response> {
  let body: { user_id?: number };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.user_id) {
    return json({ error: "user_id required" }, 400);
  }

  try {
    const service = new UsersService(env);
    const deleted = await service.deleteUser(body.user_id);
    return json({ success: true, deleted });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}

/** POST /api/admin/users/block — заблокувати/розблокувати. */
export async function handleBlockUser(request: Request, env: Env): Promise<Response> {
  let body: { user_id?: number; blocked?: boolean };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.user_id) {
    return json({ error: "user_id required" }, 400);
  }

  try {
    const service = new UsersService(env);
    await service.blockUser(body.user_id, body.blocked !== false);
    return json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
}

/** POST /api/admin/users/bulk — bulk delete/block/unblock. */
export async function handleBulkUsers(request: Request, env: Env): Promise<Response> {
  let body: { action?: string; ids?: number[] };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const action = body.action;
  const ids = Array.isArray(body.ids) ? body.ids : [];

  if (!action || ids.length === 0) {
    return json({ error: "action and ids required" }, 400);
  }

  if (action !== "delete" && action !== "block" && action !== "unblock") {
    return json({ error: `Unknown action: ${action}` }, 400);
  }

  try {
    const service = new UsersService(env);
    const processed = await service.bulkUsers(action, ids);
    return json({ success: true, processed });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
}

/** POST /api/admin/users/message — надіслати повідомлення через Telegram. */
export async function handleUserMessage(request: Request, env: Env): Promise<Response> {
  if (!env.BOT_TOKEN) {
    return json({ error: "BOT_TOKEN not configured" }, 500);
  }

  let body: { user_id?: number; text?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.user_id || !body.text) {
    return json({ error: "user_id and text required" }, 400);
  }

  try {
    const service = new UsersService(env);
    await service.sendUserMessage(body.user_id, body.text);
    return json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to send message";
    return json({ error: msg }, 500);
  }
}

/**
 * GET /api/user/profile — профіль ПОТОЧНОГО користувача.
 *
 * Ідентичність береться з підписаного Telegram `initData`, а не з query-параметра:
 * інакше будь-хто читав би роль, тариф і права будь-якого користувача.
 *
 * **Два джерела — навмисно.** З бази приходять роль, тариф, статус, знижка,
 * права й **ім'я на платформі** (їх ставить система чи адмін); з підписаного
 * `initData` — усе, що Telegram віддав тут і зараз, **як є** (у т. ч.
 * `is_premium`, `allows_write_to_pm`, `photo_url`). Живе значення має
 * перевагу над збереженим: показати людині застаріле преміум-прапорце
 * було б брехнею, а `initDataUnsafe` у браузері — дані, яким не можна вірити.
 *
 * **Решта `initData` не їде.** `auth_date`, `chat_type`, `start_param` — дані
 * сеансу, а не людини: вони лишались у відповіді для відловлювання багів і
 * більше не потрібні нікому, крім логів.
 */
export async function handleUserProfile(request: Request, env: Env): Promise<Response> {
  const identity = await resolveInitDataIdentity(request, env);
  if (!identity.ok) return identity.response;

  try {
    const user = await new UserProfileService(env).read(identity.userId);
    if (!user) {
      return json({ error: "User not found" }, 404);
    }

    return json({
      ok: true,
      user: {
        ...user,
        telegram: identity.payload.user,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to fetch user profile";
    return json({ error: msg }, 500);
  }
}

/**
 * POST /api/user/username — задати ім'я на платформі.
 *
 * Це **дія самого користувача**, тому й маршрут під `/api/user/`, а не під
 * адмін-префіксами: адмін-гейт тут не потрібен, бо `userId` узятий із підпису,
 * а не з тіла запиту — підмінити його неможливо. Тіло несе лише кандидата.
 */
export async function handleSetPlatformUsername(request: Request, env: Env): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;

  let body: { username?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const candidate = typeof body.username === "string" ? body.username : "";

  try {
    const result = await new UserProfileService(env).setPlatformUsername(
      identity.userId,
      candidate,
    );
    if (result.ok) {
      return json({ ok: true, platformUsername: result.platformUsername });
    }

    // 409 — не «помилка запиту», а чесний стан: ім'я зайняте кимось іншим.
    const status = result.code === "invalid" ? 400 : result.code === "taken" ? 409 : 500;
    return json({ error: result.message, code: result.code }, status);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to save username";
    return json({ error: msg }, 500);
  }
}
