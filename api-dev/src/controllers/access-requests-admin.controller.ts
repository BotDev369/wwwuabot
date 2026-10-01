/**
 * Повідомлення зі сторінки відмови — управління ними з панелі.
 *
 * **Це адмін-поверхня, а не другий спосіб надіслати.** Людина пише
 * `POST /api/user/access-request` (`access-request.controller.ts`) — з підписом
 * `initData`, без допуску, і це єдиний шлях поза гейтом, який пише. Тут лише
 * читання та правка рядків, які вже є, плюс запис від імені адміністратора:
 * звернення, що прийшло поза платформою (у Telegram), теж має де лежати.
 *
 * **Хто читає — тільки власник.** Усі шляхи починаються з `/api/admin/`, де
 * стоїть єдиний адмін-гейт (`ADMIN_PATH_PREFIXES` у `router.ts`): тексти
 * приватних звернень не є публічними даними, а роль `admin` у `users` нічого
 * тут не дає — вона про допуск, а не про панель.
 *
 * **Межа тексту — спільна** (`@wwwuabot/shared/access-requests`): правило одне й
 * для прийому, і для панелі, тому «можна ввести» і «можна зберегти» не
 * розходяться.
 *
 * @module api-dev/src/controllers/access-requests-admin.controller
 */

import type { Env } from "../shared/types";
import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import {
  sanitizeAccessRequestText,
  type AccessRequestItem,
} from "@wwwuabot/shared/access-requests";
import { apiLog } from "../shared/logger";

/**
 * Стеля списку: звернення — це робота адміністратора, а не стрічка новин.
 * Новіші звернення, які не вмістилися, лишаються в базі й видно за фільтром.
 */
const LIST_LIMIT = 300;

/** Рядок бази: повідомлення плюс те, що панель показує поруч із ним. */
interface AccessRequestRow {
  id: number;
  user_id: number;
  text: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  platform_username: string | null;
}

/**
 * `users` приєднується **ліворуч**: людину могли видалити, а її звернення —
 * ні. Тоді автора видно як `—`, але звернення не зникає з огляду разом із
 * рядком людини: це рішення адміністратора, а не побічний ефект видалення.
 */
const SELECT_ITEMS = `SELECT access_requests.id, access_requests.user_id,
    access_requests.text, access_requests.created_at,
    users.first_name, users.last_name, users.username, users.platform_username
  FROM access_requests LEFT JOIN users ON users.user_id = access_requests.user_id
  ORDER BY access_requests.created_at DESC, access_requests.id DESC
  LIMIT ?`;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function toItem(row: AccessRequestRow): AccessRequestItem {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    text: row.text ?? "",
    created_at: row.created_at ?? "",
    first_name: row.first_name ?? null,
    last_name: row.last_name ?? null,
    username: row.username ?? null,
    platform_username: row.platform_username ?? null,
  };
}

/** Тіло запиту: розбираємо самі — `unknown` із клієнта не довіряємо. */
async function readBody(
  request: Request,
): Promise<{ id?: unknown; user_id?: unknown; text?: unknown }> {
  try {
    const body = (await request.json()) as { id?: unknown; user_id?: unknown; text?: unknown };
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

/** Номер рядка з тіла або з `?id=`; `null`, коли його нема або він не число. */
function requestId(source: { id?: unknown }, search: URLSearchParams): number | null {
  const raw = source.id ?? search.get("id");
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function listItems(db: D1Database): Promise<AccessRequestItem[]> {
  const result = await db.prepare(SELECT_ITEMS).bind(LIST_LIMIT).all<AccessRequestRow>();
  return (result.results ?? []).map(toItem);
}

/** Один рядок після запису — щоб панель показала те, що сервер щойно зберіг. */
async function readItem(db: D1Database, id: number): Promise<AccessRequestItem | null> {
  const row = await db
    .prepare(
      `SELECT access_requests.id, access_requests.user_id,
        access_requests.text, access_requests.created_at,
        users.first_name, users.last_name, users.username, users.platform_username
       FROM access_requests LEFT JOIN users ON users.user_id = access_requests.user_id
       WHERE access_requests.id = ?`,
    )
    .bind(id)
    .first<AccessRequestRow>();
  return row ? toItem(row) : null;
}

/**
 * Новий запис від імені адміністратора.
 *
 * **Автор мусить існувати.** `user_id` — обов'язкова колонка, і рядок про
 * людину, якої немає в базі, був би зверненням у порожнечу. Тому перевірка
 * перед записом: незнайдений номер — 404, а не рядок-сирота (AGENTS.md §7).
 */
async function createItem(request: Request, db: D1Database): Promise<Response> {
  const body = await readBody(request);
  const text = sanitizeAccessRequestText(body.text);
  if (!text) return json({ ok: false, error: "Порожнє повідомлення" }, 400);

  const userId = Number(body.user_id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return json({ ok: false, error: "Не вказано автора" }, 400);
  }

  const author = await db
    .prepare("SELECT user_id FROM users WHERE user_id = ?")
    .bind(userId)
    .first<{ user_id: number }>();
  if (!author) return json({ ok: false, error: "Такого користувача немає" }, 404);

  const inserted = await db
    .prepare("INSERT INTO access_requests (user_id, text) VALUES (?, ?)")
    .bind(userId, text)
    .run();
  const id = Number(inserted.meta?.last_row_id ?? 0);
  return json({ ok: true, item: await readItem(db, id) });
}

/**
 * Правка тексту — те, що адміністратор реально може змінити в повідомленні.
 *
 * Автора не рухаємо: він сказав те, що сказав, і переписувати його слова під
 * іншою людиною — підміна, а не редагування. `404` і для неіснуючого, і для
 * чужого номера не розрізняються: коду відповіді теж не можна довіряти (AGENTS.md §7).
 */
async function updateItem(request: Request, db: D1Database): Promise<Response> {
  const body = await readBody(request);
  const id = requestId(body, new URL(request.url).searchParams);
  if (id === null) return json({ ok: false, error: "Не вказано номер" }, 400);

  const text = sanitizeAccessRequestText(body.text);
  if (!text) return json({ ok: false, error: "Порожнє повідомлення" }, 400);

  const result = await db
    .prepare("UPDATE access_requests SET text = ? WHERE id = ?")
    .bind(text, id)
    .run();
  if ((result.meta?.changes ?? 0) === 0) return json({ ok: false, error: "Not found" }, 404);
  return json({ ok: true, item: await readItem(db, id) });
}

/**
 * Видалення — окрема дія, а не прапорець у правці: панель має сказати «видалити
 * повідомлення», і це має бути видиме в запиті. Той самий 404 на
 * неіснуючий/чужий номер.
 */
async function deleteItem(request: Request, db: D1Database): Promise<Response> {
  const id = requestId({}, new URL(request.url).searchParams);
  if (id === null) return json({ ok: false, error: "Не вказано номер" }, 400);

  const result = await db.prepare("DELETE FROM access_requests WHERE id = ?").bind(id).run();
  if ((result.meta?.changes ?? 0) === 0) return json({ ok: false, error: "Not found" }, 404);
  return json({ ok: true, id });
}

/** Спільна обгортка: `ensureTables` і єдиний шлях помилки в лог. */
async function handle(action: (db: D1Database) => Promise<Response>, env: Env): Promise<Response> {
  try {
    await ensureTables(env.DB, ["access_requests"]);
    return await action(env.DB);
  } catch (error: unknown) {
    apiLog.error("access requests admin error", error);
    return json({ ok: false, error: "Internal error" }, 500);
  }
}

/** `GET /api/admin/access-requests` — список звернень, нові першими. */
export function handleAccessRequestsList(request: Request, env: Env): Promise<Response> {
  return handle(
    (db) => Promise.resolve(listItems(db)).then((items) => json({ ok: true, items })),
    env,
  );
}

/** `POST /api/admin/access-requests` — записати звернення, що прийшло поза платформою. */
export function handleAccessRequestCreate(request: Request, env: Env): Promise<Response> {
  return handle((db) => createItem(request, db), env);
}

/** `POST /api/admin/access-requests/update` — виправити текст. */
export function handleAccessRequestUpdate(request: Request, env: Env): Promise<Response> {
  return handle((db) => updateItem(request, db), env);
}

/** `DELETE /api/admin/access-requests?id=…` — прибрати повідомлення. */
export function handleAccessRequestDelete(request: Request, env: Env): Promise<Response> {
  return handle((db) => deleteItem(request, db), env);
}
