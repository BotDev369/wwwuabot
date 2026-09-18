/**
 * Контакти людини — «МоїКонтакти», HTTP-бік.
 *
 * Тут — **форма запиту** й нічого більше: метод, номер у `?id=`, JSON. Правила
 * самого довідника (як рядок бази стає контактом, коли лінк видавати не можна,
 * скільком людям контакт закріпив контакт) живуть у
 * `services/contacts.service.ts` — вони не про HTTP, і тримати їх поряд із
 * розбором `URL` означало б, що кожна правка правила змушує читати розмітку
 * запитів.
 *
 * **Контакт — це запис, а не лінк.** Раніше тут були «лінки запрошення»: рядок
 * народжувався разом із кодом, і більше нічого про людину не знав. Тепер запис
 * заводять руками, а лінк — його поле, і створюють його окремим шляхом
 * (`POST /api/contacts/link`).
 *
 * Ідентичність — тільки з підписаного `initData` (`resolveUserId`): у запиті
 * немає жодного `user_id`, тож попросити чужі контакти нічим.
 *
 * @module api-dev/src/controllers/contacts.controller
 */

import type { Env } from "../shared/types";
import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import {
  createContact,
  deleteContact,
  listContacts,
  makeLink,
  updateContact,
  type ContactDeleteResult,
  type ContactResult,
} from "../services/contacts.service";
import { resolveUserId } from "../shared/identity";
import { apiLog } from "../shared/logger";

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

/** Номер свого контакту з `?id=`; `null` — параметра немає або він не номер. */
function readId(request: Request): number | null {
  const id = Number(new URL(request.url).searchParams.get("id"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Переклад результату сервісу в HTTP — єдине місце, де вони зустрічаються. */
function respond(result: ContactResult | ContactDeleteResult): Response {
  if (!result.ok) return json({ ok: false, error: result.error }, result.status);
  return json("contact" in result ? { ok: true, contact: result.contact } : { ok: true });
}

/**
 * `GET` / `POST` / `PATCH` / `DELETE /api/contacts` — контакти людини.
 *
 * Таблиця створюється тут, а не міграцією: бот пише першим (людина відкриває
 * бота раніше, ніж платформа встигає щось створити), і `ensureTables` тримає
 * обидва боки на тій самій схемі.
 */
export async function handleContacts(request: Request, env: Env): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;

  try {
    await ensureTables(env.DB, ["contacts"]);

    if (request.method === "GET") {
      return json({ ok: true, contacts: await listContacts(env, identity.userId) });
    }
    if (request.method === "DELETE") {
      const id = readId(request);
      if (id === null) return json({ ok: false, error: "Missing id" }, 400);

      return respond(await deleteContact(env, identity.userId, id));
    }

    // Створення й правка відрізняються лише наявністю номера — тож JSON
    // читаємо один раз, а далі шлях вирішує метод.
    const body = await readJson(request);
    if (!body) return json({ ok: false, error: "Invalid JSON" }, 400);

    if (request.method === "POST") {
      return respond(await createContact(env, identity.userId, body));
    }
    if (request.method === "PATCH") {
      const id = readId(request);
      if (id === null) return json({ ok: false, error: "Missing id" }, 400);

      return respond(await updateContact(env, identity.userId, id, body));
    }
    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (e: unknown) {
    apiLog.error("Contacts error", e);
    return json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
}

/** `POST /api/contacts/link?id=` — особистий лінк контакту (окрема дія, окремий шлях). */
export async function handleContactLink(request: Request, env: Env): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;

  const id = readId(request);
  if (id === null) return json({ ok: false, error: "Missing id" }, 400);

  try {
    await ensureTables(env.DB, ["contacts"]);
    return respond(await makeLink(env, identity.userId, id));
  } catch (e: unknown) {
    apiLog.error("Contact link error", e);
    return json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
}
