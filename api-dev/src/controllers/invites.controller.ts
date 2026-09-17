/**
 * Особисті лінки-запрошення — «МоїКонтакти».
 *
 * Лінк створює тут платформа, а **закріплює контакт бот**: людина приходить із
 * `?start=<код>`, і `bot-dev` пише `invited_user_id`. Тому контролер читає чужий
 * запис лише тим, що той уже закріпив, і завжди **у своєму рядку**: власник
 * стоїть у самому `WHERE`, а не окремою перевіркою після читання (AGENTS.md §7).
 *
 * Ідентичність — тільки з підписаного `initData` (`resolveUserId`): у запиті
 * немає жодного `user_id`, тож попросити чужі лінки нічим. Сховище — таблиця
 * `invites` (`packages/shared/src/database/tables.ts`).
 *
 * @module api-dev/src/controllers/invites.controller
 */

import type { Env } from "../shared/types";
import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import {
  buildInviteLink,
  contactDisplayName,
  inviteCodeFromToken,
  sanitizeInviteLabel,
  type InviteLink,
} from "@wwwuabot/shared/invites";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import { resolveUserId } from "../shared/identity";
import { readBotUsername } from "../shared/bot-identity";
import { apiLog } from "../shared/logger";

/** Стеля списку: лінк — це контакт, а не стрічка. */
const LIST_LIMIT = 200;

/** Скільки разів пробувати інший код, якщо цей уже зайнятий (UNIQUE). */
const MAX_CODE_ATTEMPTS = 4;

const JOINED = `invites.id AS id, invites.code AS code, invites.label AS label,
        invites.invited_user_id AS invited_user_id, invites.invited_at AS invited_at,
        invites.created_at AS created_at, users.platform_username AS platform_username,
        users.first_name AS first_name, users.last_name AS last_name, users.username AS username`;

/** Рядок, як він приходить із D1 (ім'я контакту — з `users`). */
interface InviteRecord {
  id: number;
  code: string;
  label: string | null;
  invited_user_id: number | null;
  invited_at: string | null;
  created_at: string | null;
  platform_username: string | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Випадковий токен коду — латиниця й цифри, рівно ті, що приймає Telegram. */
function randomToken(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => (byte % 36).toString(36)).join("");
}

/** Рядок бази → лінк для клієнта, разом із готовим діплінком. */
function toLink(
  row: InviteRecord,
  botUsername: string | null,
  nested: Map<number, number>,
): InviteLink {
  const contactId = row.invited_user_id;
  const joined = contactId === null || contactId === undefined;

  return {
    id: row.id,
    code: row.code,
    label: row.label ?? "",
    deepLink: buildInviteLink(botUsername, row.code).deepLink,
    contact: joined
      ? null
      : {
          userId: contactId,
          name: contactDisplayName({
            platformUsername: row.platform_username,
            firstName: row.first_name,
            lastName: row.last_name,
            username: row.username,
          }),
          username: row.username,
          joinedAt: row.invited_at ?? "",
          // Другий рівень схеми залучених: скільком людям лінк дав **контакт**.
          invitedCount: nested.get(contactId) ?? 0,
        },
    createdAt: row.created_at ?? "",
  };
}

/**
 * Скільки контактів закріпив кожен із цих людей.
 *
 * Одним запитом, а не по одному на контакт: схема залучених — це список, і
 * N запитів тут були б видимою паузою на кожному відкритті екрана.
 */
async function nestedCounts(
  db: D1Database,
  owners: readonly number[],
): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  if (owners.length === 0) return counts;

  const placeholders = owners.map(() => "?").join(", ");
  const result = await db
    .prepare(
      `SELECT owner_id, COUNT(*) AS total FROM invites WHERE owner_id IN (${placeholders}) GROUP BY owner_id`,
    )
    .bind(...owners)
    .all<{ owner_id: number; total: number }>();

  for (const row of result.results ?? []) counts.set(Number(row.owner_id), Number(row.total));
  return counts;
}

/** Список лінків людини: контакти, що закріплені за ними, і глибина їхньої гілки. */
async function listInvites(
  db: D1Database,
  ownerId: number,
  botUsername: string | null,
): Promise<InviteLink[]> {
  const result = await db
    .prepare(
      `SELECT ${JOINED} FROM invites LEFT JOIN users ON users.user_id = invites.invited_user_id
       WHERE invites.owner_id = ? ORDER BY invites.created_at DESC, invites.id DESC LIMIT ?`,
    )
    .bind(ownerId, LIST_LIMIT)
    .all<InviteRecord>();

  const rows = result.results ?? [];
  const owners = rows
    .map((row) => row.invited_user_id)
    .filter((id): id is number => typeof id === "number");
  const nested = await nestedCounts(db, owners);

  return rows.map((row) => toLink(row, botUsername, nested));
}

/** Один рядок — **разом з умовою власника**, тим самим правилом, що й список. */
async function readInvite(
  db: D1Database,
  id: number,
  ownerId: number,
  botUsername: string | null,
): Promise<InviteLink | null> {
  const row = await db
    .prepare(
      `SELECT ${JOINED} FROM invites LEFT JOIN users ON users.user_id = invites.invited_user_id
       WHERE invites.id = ? AND invites.owner_id = ?`,
    )
    .bind(id, ownerId)
    .first<InviteRecord>();

  return row ? toLink(row, botUsername, await nestedCounts(db, [])) : null;
}

/**
 * Створення лінка. Код генерується тут, а не клієнтом: код — це адреса, і
 * складати її в браузері означало б довіряти браузеру право зайняти чужий код.
 */
async function createInvite(
  request: Request,
  db: D1Database,
  ownerId: number,
  botUsername: string | null,
): Promise<Response> {
  let body: { label?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  const label = sanitizeInviteLabel(body.label);
  if (label === "") return json({ ok: false, error: "Порожній підпис" }, 400);

  const now = formatSqliteDatetime();
  let failure = "Не вдалося скласти код — спробуйте ще раз";

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = inviteCodeFromToken(randomToken());
    if (!code) continue;

    try {
      const inserted = await db
        .prepare(
          "INSERT INTO invites (owner_id, code, label, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(ownerId, code, label, now, now)
        .run();

      const id = inserted.meta?.last_row_id ?? 0;
      return json({ ok: true, link: await readInvite(db, id, ownerId, botUsername) });
    } catch (e: unknown) {
      // Новий код має сенс лише тоді, коли зайнятий **код** (UNIQUE). Будь-яку
      // іншу відмову повертаємо як є: «не вдалося» без причини — та сама тиша,
      // від якої ми тікали, коли відмовлялись від нативних діалогів (§4).
      failure = e instanceof Error ? e.message : failure;
      if (!/UNIQUE|constraint/i.test(failure)) break;
    }
  }

  return json({ ok: false, error: failure }, 500);
}

/** Видалення свого лінка за номером; чужий номер — та сама 404, що й неіснуючий. */
async function deleteInvite(request: Request, db: D1Database, ownerId: number): Promise<Response> {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: "Missing id" }, 400);

  const result = await db
    .prepare("DELETE FROM invites WHERE id = ? AND owner_id = ?")
    .bind(id, ownerId)
    .run();
  if ((result.meta?.changes ?? 0) === 0) return json({ ok: false, error: "Not found" }, 404);
  return json({ ok: true, id });
}

/**
 * `GET` / `POST` / `DELETE /api/invites` — особисті лінки людини.
 *
 * Ім'я бота беремо один раз на запит: воно однакове для всіх лінків, а
 * `readBotUsername` кешує його сам.
 */
export async function handleInvites(request: Request, env: Env): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;

  try {
    await ensureTables(env.DB, ["invites"]);

    if (request.method === "GET") {
      const botUsername = await readBotUsername(env);
      return json({ ok: true, links: await listInvites(env.DB, identity.userId, botUsername) });
    }
    if (request.method === "POST") {
      return await createInvite(request, env.DB, identity.userId, await readBotUsername(env));
    }
    if (request.method === "DELETE") {
      return await deleteInvite(request, env.DB, identity.userId);
    }
    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (e: unknown) {
    apiLog.error("Invites error", e);
    return json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
}
