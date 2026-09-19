/**
 * Повідомлення між людьми — екран «Повідомлення», HTTP-бік.
 *
 * Тут — **форма запиту** й нічого більше: метод, номер співрозмовника в `?peer=`
 * або в тілі, JSON. Правила самої переписки (кому можна писати, яка розмова
 * одна на двох, що вважати прочитаним) живуть у `services/messages/` — вони не
 * про HTTP, і тримати їх поряд із розбором `URL` означало б, що кожна правка
 * правила змушує читати розмітку запитів.
 *
 * **Ідентичність — тільки з підписаного `initData`** (`resolveUserId`): у
 * запитах немає жодного «від кого», лише `peer` — кому. Тож попросити чужу
 * переписку нічим.
 *
 * **Мова про повідомлення між людьми, без бота.** Бот у переписці не бере
 * участі: ні надсилання, ні сповіщення про нове не йдуть через нього. Те, що
 * застосунок у Telegram, цього не змінює: у Mini App Web Push недоступний, тож
 * «нове повідомлення» показує сама платформа, поки вона відкрита (`/badge`).
 *
 * @module api-dev/src/controllers/messages.controller
 */

import type { Env } from "../shared/types";
import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { resolveUserId } from "../shared/identity";
import { apiLog } from "../shared/logger";
import { listConversations, unreadTotal } from "../services/messages/conversations";
import { markRead, clearThread, openThread, sendMessage } from "../services/messages/thread";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Тіло запиту як об'єкт; `null` — це не JSON, і про це треба сказати 400. */
async function readJson(request: Request): Promise<{ [key: string]: unknown } | null> {
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as { [key: string]: unknown };
  } catch {
    return null;
  }
}

/** Номер співрозмовника; `null` — не заданий або не номер. */
function readPeer(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Номер повідомлення, **старіші за який** підвантажуємо; `undefined` — не треба. */
function readBefore(request: Request): number | undefined {
  const value = new URL(request.url).searchParams.get("before");
  if (value === null) return undefined;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

/**
 * Таблиці переписки створюються тут, а не міграцією: `ensureTables`
 * ідемпотентний, а схема мусить існувати **до** першого запиту, а не після
 * нього. `contacts` у списку тому, що зв'язок читається саме з нього: без
 * таблиці перевірка «кому можна писати» падала б, а не відповідала б «нікому».
 */
function ensureSchema(env: Env): Promise<void> {
  return ensureTables(env.DB, ["conversations", "messages", "contacts"]);
}

/** `GET /api/messages` — розмови людини (найсвіжіші згори). */
export async function handleMessages(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);

  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;

  try {
    await ensureSchema(env);
    return json({ ok: true, conversations: await listConversations(env, identity.userId) });
  } catch (e: unknown) {
    apiLog.error("Messages error", e);
    return json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
}

/**
 * `GET /api/messages/thread?peer=&before=` — повідомлення розмови.
 *
 * Порожня розмова — це **не помилка**: людина могла прийти з контактів і
 * написати першою, і екран мусить її пустити в порожнє поле, а не відмовити.
 *
 * Відкриття розмови (а не лише читання) тому йде через `openThread`: людина,
 * яка прийшла за запрошенням, відкриває розмову **вперше** саме цим запитом, і
 * вітання пари мусить бути в ній уже тоді, коли стрічка прийшла на екран.
 */
export async function handleMessageThread(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);

  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;

  const peer = readPeer(new URL(request.url).searchParams.get("peer"));
  if (peer === null) return json({ ok: false, error: "Missing peer" }, 400);

  try {
    await ensureSchema(env);
    const result = await openThread(env, identity.userId, peer, readBefore(request));
    if (!result.ok) return json(result, result.status);

    return json({ ok: true, peer: result.thread.peer, messages: result.thread.messages });
  } catch (e: unknown) {
    apiLog.error("Message thread error", e);
    return json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
}

/** `POST /api/messages/send` — надіслати повідомлення співрозмовнику. */
export async function handleMessageSend(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;

  const body = await readJson(request);
  if (!body) return json({ ok: false, error: "Invalid JSON" }, 400);

  const peer = readPeer(body.peer);
  if (peer === null) return json({ ok: false, error: "Missing peer" }, 400);

  try {
    await ensureSchema(env);
    const result = await sendMessage(env, identity.userId, peer, body.body);
    if (!result.ok) return json(result, result.status);

    return json({ ok: true, message: result.message });
  } catch (e: unknown) {
    apiLog.error("Message send error", e);
    return json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
}

/** `POST /api/messages/read` — позначити прочитаним усе, що написав співрозмовник. */
export async function handleMessageRead(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;

  const body = await readJson(request);
  if (!body) return json({ ok: false, error: "Invalid JSON" }, 400);

  const peer = readPeer(body.peer);
  if (peer === null) return json({ ok: false, error: "Missing peer" }, 400);

  try {
    await ensureSchema(env);
    const result = await markRead(env, identity.userId, peer);
    if (!result.ok) return json(result, result.status);

    return json({ ok: true, read: result.read });
  } catch (e: unknown) {
    apiLog.error("Message read error", e);
    return json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
}

/**
 * `POST /api/messages/clear` — стерти переписку **у обох** (розмова лишається).
 */
export async function handleMessageClear(request: Request, env: Env): Promise<Response> {
  return dropThread(request, env, false, "Message clear error");
}

/**
 * `POST /api/messages/delete` — прибрати розмову зі списку **в обох**.
 *
 * Друга дія, а не «глибша чистка»: чистка лишає порожню розмову на місці, а ця
 * зникає зі списку в обох — так само, як історія стерта в обох: усе, що робить
 * ця дія, стосується спільної переписки, і поділити її на «моє» й «чуже» нема
 * де. Рядок розмови лишається (інакше в пари не було б жодного входу в неї), і
 * з першим новим повідомленням розмова повертається обом.
 */
export async function handleMessageDelete(request: Request, env: Env): Promise<Response> {
  return dropThread(request, env, true, "Message delete error");
}

/**
 * Спільне тіло двох дій над перепискою: `{ peer }` і жодного «від кого».
 *
 * `hideFromLists` — те єдине, чим дії відрізняються; усе інше (метод, підпис, розбір
 * тіла, зв'язок і код відповіді) у них однакове, тож друга копія цього коду
 * розійшлася б із першою на першій же правці.
 */
async function dropThread(
  request: Request,
  env: Env,
  hideFromLists: boolean,
  logLabel: string,
): Promise<Response> {
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;

  const body = await readJson(request);
  if (!body) return json({ ok: false, error: "Invalid JSON" }, 400);

  const peer = readPeer(body.peer);
  if (peer === null) return json({ ok: false, error: "Missing peer" }, 400);

  try {
    await ensureSchema(env);
    const result = await clearThread(env, identity.userId, peer, hideFromLists);
    if (!result.ok) return json(result, result.status);

    return json({ ok: true, removed: result.removed });
  } catch (e: unknown) {
    apiLog.error(logLabel, e);
    return json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
}

/**
 * `GET /api/messages/badge` — скільки чекає на прочитання.
 *
 * Найлегший шлях і найчастіший виклик: платформа опитує його, поки людина в
 * застосунку, щоб бейдж у футері був чесним. Саме тому тут **тільки число** —
 * ні імен, ні аватарів, ні останніх повідомлень.
 */
export async function handleMessageBadge(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);

  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;

  try {
    await ensureSchema(env);
    return json({ ok: true, unread: await unreadTotal(env, identity.userId) });
  } catch (e: unknown) {
    apiLog.error("Message badge error", e);
    return json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
}
