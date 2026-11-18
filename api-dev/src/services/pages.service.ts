/**
 * Сторінки, які веде людина: те, що їй дали, і те, що показано у відкритому списку.
 *
 * **Сховище — `platform_pages`, тобто таблиця сторінок платформи.** Сторінка людини не
 * окрема сутність: у неї та сама адреса (`slug`) і те саме `page_data`, яке
 * рендерить `PageRenderer`; екран бота читає її окремим `JOIN`-ом. Друга таблиця дала б друге сховище
 * одного `PageConfig` і другу реалізацію правила «яка сторінка для цього URL»
 * (`AGENTS.md` §7). Тому тут немає жодного `CREATE TABLE` — лише робота з
 * колонками `owner_id`, `admin_ids`, `is_public` і `template_key`.
 *
 * **Сторінку веде не одна людина.** Власник (`owner_id`) — той, хто створив;
 * адміни (`admin_ids`, JSON-масив) — ті, кому він віддав сторінку разом із
 * магазином: вони бачать замовлення й повідомлення покупців. Ролі читає
 * `pageRole` зі спільного модуля, а не SQL: адміни лежать JSON-ом, і в
 * `WHERE` їх не висловити.
 *
 * **Тому право перевіряє роль, а запит лишається грубою відбіркою.** Список
 * відбирається умовою `owner_id = ? OR admin_ids LIKE ?`, а рішення ухвалює
 * `isPageManager` — тобто `LIKE` тут лише **звужує** те, що потім перевірять
 * точно (id у JSON-рядку може збігтися як підрядок чужого довшого id). Один
 * рядок читає `readManaged`, і шлях, який не спитав роль, рядка не дістане.
 * Переклад рядка живе окремо (`./pages-rows`).
 *
 * **Публічність відбирає запит, а не розмітка.** Приватна сторінка не
 * дістається ні списком, ні за адресою (`listPublished` і
 * `scenarios.controller`), тож перемикач «публічно / приватно» не можна
 * обійти посиланням — та сама межа, що в публічного профілю (`docs/VISIBILITY.md`).
 *
 * @module api-dev/src/services/pages.service
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { peerLabel, type MessagePeer } from "@wwwuabot/shared/messages";
import {
  DEFAULT_PAGE_TEMPLATE,
  isPageManager,
  isPageTemplateKey,
  pageAdminIds,
  type PageTemplateKey,
  type PublicPage,
  type UserPage,
} from "@wwwuabot/shared/pages";
import type { Env } from "../shared/types";
import { PAGE_COLUMNS, ownerOf, pageStaffIdList, toManagedPage, type PageRow } from "./pages-rows";

/** Стеля списку: сторінок у людини не буває тисяча. */
const MANAGED_LIMIT = 100;

/**
 * Стеля параметрів одного запиту D1 — **100**; беремо менше, бо місце потрібне
 * ще під номер сторінки. Імена власників і адмінів читаються пачками саме тому.
 */
const NAME_BATCH = 90;

/** Скільки сторінок віддає відкритий список за раз і яка межа запиту. */
export const PUBLIC_PAGE_SIZE = 60;
const PUBLIC_PAGE_MAX = 100;

/** Колонки людини — для імені в картці «Доступ»; `peerLabel` чекає саме їх. */
const USER_COLUMNS = "user_id, first_name, last_name, username, platform_username";

interface UserRow {
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  platform_username: string | null;
}

/** Скільки віддавати за запитом: сміття й перебір дають межі, а не помилку. */
export function clampPublicPagesLimit(raw: unknown): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return PUBLIC_PAGE_SIZE;
  return Math.min(Math.floor(value), PUBLIC_PAGE_MAX);
}

/** Рядок `users` у вигляді співрозмовника — щоб ім'я переклав `peerLabel`. */
function toPeer(row: UserRow): MessagePeer {
  return {
    id: Number(row.user_id),
    firstName: row.first_name ?? null,
    lastName: row.last_name ?? null,
    username: row.username ?? null,
    platformUsername: row.platform_username ?? null,
    contactName: null,
    photoUrl: null,
  };
}

export class PagesService {
  constructor(private env: Env) {}

  private async ensureSchema(): Promise<void> {
    await ensureTables(this.env.DB, ["platform_pages"]);
  }

  /** Сторінки, які веде людина, — разом із приватними: вона має їх бачити. */
  async listManaged(userId: number): Promise<UserPage[]> {
    await this.ensureSchema();

    const result = await this.env.DB.prepare(
      `SELECT ${PAGE_COLUMNS} FROM platform_pages
        WHERE owner_id = ? OR admin_ids LIKE ?
        ORDER BY updated_at DESC, id DESC LIMIT ?`,
    )
      .bind(userId, `%${userId}%`, MANAGED_LIMIT)
      .all<PageRow>();

    const rows = (result.results ?? []).filter((row) =>
      isPageManager(ownerOf(row), pageAdminIds(row.admin_ids), userId),
    );
    const names = await this.staffNames(rows);

    return rows
      .map((row) => toManagedPage(row, userId, names))
      .filter((page): page is UserPage => page !== null);
  }

  /**
   * Відкритий список: сторінки, які автори відкрили.
   *
   * Умови: `is_public` — вибір автора, `is_active` — зняте не показується,
   * `is_blocked` — рішення про людину. Рядок без власника — контент
   * платформи, а не «чужа сторінка»: так публікується дослідження
   * (`docs/RESEARCH.md`), і підпис автора тоді дає платформа.
   */
  async listPublished(limit: unknown = PUBLIC_PAGE_SIZE): Promise<PublicPage[]> {
    await this.ensureSchema();

    const result = await this.env.DB.prepare(
      `SELECT s.id, s.slug, s.title, s.template_key, s.updated_at,
              u.user_id AS author_id, u.platform_username AS author_name,
              u.photo_url AS author_photo
         FROM platform_pages s
         LEFT JOIN users u ON u.user_id = s.owner_id
        WHERE COALESCE(s.is_public, 0) = 1
          AND s.is_active = 1
          AND (s.owner_id IS NULL OR COALESCE(u.is_blocked, 0) = 0)
        ORDER BY s.updated_at DESC, s.id DESC
        LIMIT ?`,
    )
      .bind(clampPublicPagesLimit(limit))
      .all<Record<string, unknown>>();

    return (result.results ?? []).map((row) => ({
      id: Number(row.id),
      slug: String(row.slug ?? ""),
      title: String(row.title ?? ""),
      template: (isPageTemplateKey(row.template_key)
        ? row.template_key
        : DEFAULT_PAGE_TEMPLATE) as PageTemplateKey,
      author: {
        // Номер `0` — «автора немає, це контент платформи»: підпис тоді дає
        // клієнт (`publicPageAuthor`), а не порожнє ім'я.
        id: row.author_id === null || row.author_id === undefined ? 0 : Number(row.author_id),
        name: (row.author_name as string) ?? null,
        photoUrl: (row.author_photo as string) ?? null,
      },
      updatedAt: (row.updated_at as string) ?? "",
    }));
  }

  /**
   * Імена тих, хто веде ці сторінки, — **пачками** й лише за потрібними id.
   *
   * Одним запитом на весь список не вийде: у D1 стеля параметрів (див.
   * `NAME_BATCH`), а в рядка буває ще й двадцять адмінів. Пачка тут дешевша за
   * двадцять запитів і чесніша за мовчазне обрізання списку. Переклад імені —
   * `peerLabel`, той самий, що в переписці: імені людини в продукті один закон.
   */
  private async staffNames(rows: readonly PageRow[]): Promise<Map<number, string | null>> {
    const names = new Map<number, string | null>();
    const ids = [...new Set(rows.flatMap((row) => pageStaffIdList(row)))];
    if (ids.length === 0) return names;

    for (let start = 0; start < ids.length; start += NAME_BATCH) {
      const batch = ids.slice(start, start + NAME_BATCH);
      const placeholders = batch.map(() => "?").join(", ");
      const result = await this.env.DB.prepare(
        `SELECT ${USER_COLUMNS} FROM users WHERE user_id IN (${placeholders})`,
      )
        .bind(...batch)
        .all<UserRow>();

      for (const row of result.results ?? []) {
        names.set(Number(row.user_id), peerLabel(toPeer(row)));
      }
    }

    // Людини може не бути в `users` (бот її ще не бачив) — і тоді в неї немає
    // імені, але id лишається: картка покаже номер, а не порожній рядок.
    for (const id of ids) if (!names.has(id)) names.set(id, null);
    return names;
  }
}
