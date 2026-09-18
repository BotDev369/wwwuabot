/**
 * Контакти людини — дані, а не HTTP.
 *
 * **Навіщо окремо.** Контролер відповідає за форму запиту (метод, номер у
 * `?id=`, JSON), а тут живуть правила самого довідника: як рядок бази стає
 * контактом, що означає «ім'я порожнє», коли лінк видавати не можна й скільком
 * людям контакт закріпив контакт. Друге — не про HTTP, і саме тому це не має
 * жити в одному файлі з розбором `URL`.
 *
 * **Контакт — це запис, а не лінк.** Запис заводять руками (ім'я, `@username`,
 * Telegram-id, хештеги, примітки), а лінк — **одне з його полів**: контакт може
 * жити без лінка, і лінк створюють окремою дією. Тому таблиця одна — `contacts`:
 * друга (`invites`) була б другим сховищем того самого контакту (AGENTS.md §7).
 *
 * **Факт приєднання закріплює бот.** Людина приходить із `?start=<код>`, і
 * `bot-dev` пише `telegram_user_id` та `joined_at` — один раз і назавжди
 * (`WHERE telegram_user_id IS NULL`). Тут ці колонки не пишуться ніколи:
 * інакше власник міг би «приєднати» контакт, який не приєднувався.
 *
 * **Власник — у самому `WHERE`** кожного запиту, а не окремою перевіркою після
 * читання: так чужий номер відповідає тією ж 404, що й неіснуючий, і код
 * відповіді теж не витікає.
 *
 * @module api-dev/src/services/contacts.service
 */

import type { Env } from "../shared/types";
import { readBotUsername } from "../shared/bot-identity";
import {
  buildInviteLink,
  inviteCodeFromToken,
  sanitizeContactName,
  sanitizeContactNotes,
  sanitizeContactUsername,
  sanitizeTelegramId,
  type Contact,
} from "@wwwuabot/shared/contacts";
import { parseTagsJson, sanitizeTags, tagsToJson } from "@wwwuabot/shared/tags";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";

/** Стеля списку: контакти — довідник, а не стрічка. */
const LIST_LIMIT = 200;

/** Скільки разів пробувати інший код, якщо цей уже зайнятий (UNIQUE). */
const MAX_CODE_ATTEMPTS = 4;

/** Колонки читаємо за іменами, а не `SELECT *`: так само, як в інших таблицях. */
const COLUMNS = `id, name, username, telegram_user_id, tags, notes, code, joined_at,
        created_at, updated_at`;

/** Рядок, як він лежить у D1. */
interface ContactRecord {
  id: number;
  name: string | null;
  username: string | null;
  telegram_user_id: number | null;
  tags: string | null;
  notes: string | null;
  code: string | null;
  joined_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Те, що власник заповнює в картці — уже нормалізоване. */
export interface ContactFields {
  name: string;
  username: string | null;
  telegramUserId: number | null;
  tags: string[];
  notes: string;
}

/**
 * Результат дії над контактом: або рядок, або відмова зі статусом.
 *
 * Це не «помилка в контролері»: причину відмови знає **правило довідника**
 * (порожнє ім'я, чужий номер, приєднаний контакт), тож воно й каже її — а
 * контролер лише перекладає в HTTP.
 */
export type ContactResult =
  { ok: true; contact: Contact } | { ok: false; status: number; error: string };

/** Результат видалення: рядка немає, тож підтверджується сама дія. */
export type ContactDeleteResult = { ok: true } | { ok: false; status: number; error: string };

/** Випадковий токен коду — латиниця й цифри, рівно ті, що приймає Telegram. */
function randomToken(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => (byte % 36).toString(36)).join("");
}

/** Поля з тіла запиту — з тими самими правилами, що показує картка. */
export function readFields(body: { [key: string]: unknown }): ContactFields {
  return {
    name: sanitizeContactName(body.name),
    username: sanitizeContactUsername(body.username),
    telegramUserId: sanitizeTelegramId(body.telegramUserId),
    tags: sanitizeTags(body.tags),
    notes: sanitizeContactNotes(body.notes),
  };
}

/**
 * Рядок бази → контакт для клієнта.
 *
 * Дві речі тут обчислюються, а не лежать у колонках: готовий діплінк (ім'я бота
 * знає тільки сервер) і глибина гілки (`nested`). Обидва — той самий факт під
 * іншим кутом, тож рахуються при читанні, а не зберігаються.
 */
function toContact(
  row: ContactRecord,
  botUsername: string | null,
  nested: Map<number, number>,
): Contact {
  const telegramUserId = row.telegram_user_id ?? null;

  return {
    id: row.id,
    name: row.name ?? "",
    username: row.username ?? null,
    telegramUserId,
    tags: parseTagsJson(row.tags),
    notes: row.notes ?? "",
    code: row.code ?? null,
    deepLink: row.code ? buildInviteLink(botUsername, row.code).deepLink : null,
    joinedAt: row.joined_at ?? null,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
    invitedCount: telegramUserId === null ? 0 : (nested.get(telegramUserId) ?? 0),
  };
}

/**
 * Скільком контактам **ці люди** закріпили контакт.
 *
 * Одним запитом, а не по одному на контакт: схема залучених — це список, і
 * N запитів тут були б видимою паузою на кожному відкритті екрана. Рахуємо
 * лише закріплені приєднання (`telegram_user_id IS NOT NULL`) — контакт без
 * лінка нікого не залучив.
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
      `SELECT owner_id, COUNT(*) AS total FROM contacts
       WHERE owner_id IN (${placeholders}) AND telegram_user_id IS NOT NULL GROUP BY owner_id`,
    )
    .bind(...owners)
    .all<{ owner_id: number; total: number }>();

  for (const row of result.results ?? []) counts.set(Number(row.owner_id), Number(row.total));
  return counts;
}

/** Один рядок **разом з умовою власника** — тим самим правилом, що й список. */
async function readContact(
  db: D1Database,
  id: number,
  ownerId: number,
  botUsername: string | null,
): Promise<Contact | null> {
  const row = await db
    .prepare(`SELECT ${COLUMNS} FROM contacts WHERE id = ? AND owner_id = ?`)
    .bind(id, ownerId)
    .first<ContactRecord>();

  if (!row) return null;

  const owners = row.telegram_user_id === null ? [] : [row.telegram_user_id];
  return toContact(row, botUsername, await nestedCounts(db, owners));
}

/** Список контактів людини; глибину гілки рахуємо одним запитом на весь список. */
export async function listContacts(env: Env, ownerId: number): Promise<Contact[]> {
  const botUsername = await readBotUsername(env);
  const result = await env.DB.prepare(
    `SELECT ${COLUMNS} FROM contacts WHERE owner_id = ?
       ORDER BY created_at DESC, id DESC LIMIT ?`,
  )
    .bind(ownerId, LIST_LIMIT)
    .all<ContactRecord>();

  const rows = result.results ?? [];
  const owners = rows
    .map((row) => row.telegram_user_id)
    .filter((id): id is number => typeof id === "number");
  const nested = await nestedCounts(env.DB, owners);

  return rows.map((row) => toContact(row, botUsername, nested));
}

/**
 * Створення контакту — **без лінка**.
 *
 * Лінк це окрема дія, і саме тому «створити» не означає «запросити»: контакт
 * може бути людиною, яку власник уже знає, і надсилати їй посилання нема
 * причини. Ім'я обов'язкове — без нього список стає стовпчиком порожніх карток.
 */
export async function createContact(
  env: Env,
  ownerId: number,
  body: { [key: string]: unknown },
): Promise<ContactResult> {
  const fields = readFields(body);
  if (fields.name === "") return { ok: false, status: 400, error: "Порожнє ім'я контакту" };

  const now = formatSqliteDatetime();
  const inserted = await env.DB.prepare(
    `INSERT INTO contacts (owner_id, name, username, telegram_user_id, tags, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      ownerId,
      fields.name,
      fields.username,
      fields.telegramUserId,
      tagsToJson(fields.tags),
      fields.notes,
      now,
      now,
    )
    .run();

  const id = inserted.meta?.last_row_id ?? 0;
  const contact = await readContact(env.DB, id, ownerId, await readBotUsername(env));
  return contact ? { ok: true, contact } : { ok: false, status: 500, error: "Not found" };
}

/**
 * Правка контакту: усі поля одразу, **крім наслідкових**.
 *
 * `telegram_user_id` тут є — але це поле власника («я знаю, хто це»), а не факт
 * приєднання: `joined_at` ставить тільки бот.
 */
export async function updateContact(
  env: Env,
  ownerId: number,
  id: number,
  body: { [key: string]: unknown },
): Promise<ContactResult> {
  const fields = readFields(body);
  if (fields.name === "") return { ok: false, status: 400, error: "Порожнє ім'я контакту" };

  const result = await env.DB.prepare(
    `UPDATE contacts SET name = ?, username = ?, telegram_user_id = ?, tags = ?, notes = ?, updated_at = ?
       WHERE id = ? AND owner_id = ?`,
  )
    .bind(
      fields.name,
      fields.username,
      fields.telegramUserId,
      tagsToJson(fields.tags),
      fields.notes,
      formatSqliteDatetime(),
      id,
      ownerId,
    )
    .run();
  if ((result.meta?.changes ?? 0) === 0) return { ok: false, status: 404, error: "Not found" };

  const contact = await readContact(env.DB, id, ownerId, await readBotUsername(env));
  return contact ? { ok: true, contact } : { ok: false, status: 404, error: "Not found" };
}

/**
 * Особистий лінк контакту: скласти новий або замінити старий.
 *
 * **Приєднаному контакту лінк не видається.** Закріплення стається лише раз
 * (`WHERE telegram_user_id IS NULL`), тож лінк для людини, яка вже приєдналась,
 * не закріпив би нікого — а виглядав би як робочий. Це та сама чесність, що й
 * у заглушок меню: краще сказати вголос, ніж видати посилання, яке мовчки
 * нічого не робить.
 */
export async function makeLink(env: Env, ownerId: number, id: number): Promise<ContactResult> {
  const db = env.DB;
  const current = await db
    .prepare("SELECT id, telegram_user_id FROM contacts WHERE id = ? AND owner_id = ?")
    .bind(id, ownerId)
    .first<{ id: number; telegram_user_id: number | null }>();
  if (!current) return { ok: false, status: 404, error: "Not found" };
  if (current.telegram_user_id !== null) {
    return {
      ok: false,
      status: 400,
      error: "Контакт уже приєднався — лінк більше нікого не закріпить",
    };
  }

  const now = formatSqliteDatetime();
  let failure = "Не вдалося скласти код — спробуйте ще раз";

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = inviteCodeFromToken(randomToken());
    if (!code) continue;

    try {
      await db
        .prepare("UPDATE contacts SET code = ?, updated_at = ? WHERE id = ? AND owner_id = ?")
        .bind(code, now, id, ownerId)
        .run();
      const contact = await readContact(db, id, ownerId, await readBotUsername(env));
      return contact ? { ok: true, contact } : { ok: false, status: 404, error: "Not found" };
    } catch (e: unknown) {
      // Новий код має сенс лише тоді, коли зайнятий **код** (UNIQUE). Будь-яку
      // іншу відмову повертаємо як є: «не вдалося» без причини — та сама тиша,
      // від якої ми тікали, коли відмовлялись від нативних діалогів (§4).
      failure = e instanceof Error ? e.message : failure;
      if (!/UNIQUE|constraint/i.test(failure)) break;
    }
  }

  return { ok: false, status: 500, error: failure };
}

/** Видалення свого контакту за номером; чужий номер — та сама 404, що й неіснуючий. */
export async function deleteContact(
  env: Env,
  ownerId: number,
  id: number,
): Promise<ContactDeleteResult> {
  const result = await env.DB.prepare("DELETE FROM contacts WHERE id = ? AND owner_id = ?")
    .bind(id, ownerId)
    .run();
  if ((result.meta?.changes ?? 0) === 0) return { ok: false, status: 404, error: "Not found" };
  return { ok: true };
}
