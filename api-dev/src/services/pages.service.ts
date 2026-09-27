/**
 * Сторінки, які створила людина: те, що вона веде, і те, що показано в Просторі.
 *
 * **Сховище — `scenarios`, тобто та сама таблиця контенту.** Сторінка людини не
 * окрема сутність: у неї та сама адреса (`slug`) і те саме `page_data`, яке
 * рендерить `PageRenderer` і читає бот. Друга таблиця дала б друге сховище
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
 * обійти посиланням — та сама межа, що в публічного профілю (`docs/SPACE.md`).
 *
 * @module api-dev/src/services/pages.service
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { peerLabel, type MessagePeer } from "@wwwuabot/shared/messages";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import {
  DEFAULT_PAGE_TEMPLATE,
  PAGE_SLUG_MAX,
  adminIdsJson,
  buildPageConfig,
  cleanAdminIds,
  isPageManager,
  isPageTemplateKey,
  pageAdminIds,
  pageRole,
  pageTemplate,
  pageTitle,
  type PageDraftInput,
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

/** Скільки сторінок віддає Простір за раз і яка межа запиту. */
export const SPACE_PAGE_SIZE = 60;
const SPACE_PAGE_MAX = 100;

/** Колонки людини — для імені в картці «Доступ»; `peerLabel` чекає саме їх. */
const USER_COLUMNS = "user_id, first_name, last_name, username, platform_username";

interface UserRow {
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  platform_username: string | null;
}

/** Що сталося зі збереженням: контролер перекладає це в код відповіді. */
export type PageSaveOutcome =
  { kind: "saved"; page: UserPage } | { kind: "not_found" } | { kind: "address_taken" };

/** Скільки віддавати за запитом: сміття й перебір дають межі, а не помилку. */
export function clampSpacePagesLimit(raw: unknown): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return SPACE_PAGE_SIZE;
  return Math.min(Math.floor(value), SPACE_PAGE_MAX);
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
    await ensureTables(this.env.DB, ["scenarios"]);
  }

  /** Сторінки, які веде людина, — разом із приватними: вона має їх бачити. */
  async listManaged(userId: number): Promise<UserPage[]> {
    await this.ensureSchema();

    const result = await this.env.DB.prepare(
      `SELECT ${PAGE_COLUMNS} FROM scenarios
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

  /** Одна сторінка, яку веде людина; чужий номер поводиться як неіснуючий. */
  async readManaged(id: number, userId: number): Promise<UserPage | null> {
    await this.ensureSchema();

    const row = await this.rowById(id);
    if (!row) return null;

    const names = await this.staffNames([row]);
    return toManagedPage(row, userId, names);
  }

  /**
   * Запис: `id` є — правка, немає — нова.
   *
   * **Адресу не підмінюємо мовчки.** Якщо людина змінила адресу на зайняту,
   * це відмова (`address_taken`), а не «…-2»: посилання, яке вона запам'ятала,
   * повело б в інше місце. А от коли адреса вільна — зайняти її можна: саме
   * тому при **створенні** вільний варіант шукає `uniqueAddress`, а не
   * відмова.
   *
   * **Склад адмінів міняє лише власник.** Адмін веде сторінку й магазин, але
   * доступ роздає той, кому вона належить: інакше запрошений міг би звузити
   * чужий доступ, лишивши власника осторонь. Чернетка без поля `admins`
   * (`PageDraftInput.admins === null`) склад не чіпає взагалі — нею ходять
   * перемикач публічності й редактор тексту.
   */
  async save(userId: number, input: PageDraftInput, id?: number): Promise<PageSaveOutcome> {
    await this.ensureSchema();

    const template = pageTemplate(input.template);
    const now = formatSqliteDatetime();
    const title = pageTitle(template, input.values);
    const pageData = JSON.stringify(buildPageConfig(template, input.values));
    const isPublic = input.isPublic ? 1 : 0;

    if (id !== undefined) {
      const current = await this.rowById(id);
      const role = current
        ? pageRole(ownerOf(current), pageAdminIds(current.admin_ids), userId)
        : null;
      if (!current || role === null) return { kind: "not_found" };

      if (current.slug !== input.address) {
        const taken = await this.addressOwner(input.address, id);
        if (taken) return { kind: "address_taken" };
      }

      const admins =
        input.admins !== null && role === "owner"
          ? adminIdsJson(input.admins)
          : adminIdsJson(pageAdminIds(current.admin_ids));

      await this.env.DB.prepare(
        `UPDATE scenarios
            SET slug = ?, title = ?, page_data = ?, template_key = ?, is_public = ?,
                admin_ids = ?, updated_at = ?
          WHERE id = ?`,
      )
        .bind(input.address, title, pageData, template.key, isPublic, admins, now, id)
        .run();

      const page = await this.readManaged(id, userId);
      return page ? { kind: "saved", page } : { kind: "not_found" };
    }

    const slug = await this.uniqueAddress(input.address);
    const admins = cleanAdminIds(input.admins ?? []);
    const inserted = await this.env.DB.prepare(
      `INSERT INTO scenarios
         (slug, title, page_data, template_key, is_public, owner_id, admin_ids, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    )
      .bind(slug, title, pageData, template.key, isPublic, userId, adminIdsJson(admins), now, now)
      .run();

    const page = await this.readManaged(Number(inserted.meta?.last_row_id ?? 0), userId);
    return page ? { kind: "saved", page } : { kind: "not_found" };
  }

  /**
   * Видалення; `false` — рядка не було, він чужий або людина тут не власник.
   *
   * Прибирає **тільки власник**: адмін веде сторінку, але не розпоряджається
   * нею — разом із рядком зникають його адреса, товари й історія замовлень.
   */
  async remove(id: number, userId: number): Promise<boolean> {
    await this.ensureSchema();

    const result = await this.env.DB.prepare("DELETE FROM scenarios WHERE id = ? AND owner_id = ?")
      .bind(id, userId)
      .run();

    return (result.meta?.changes ?? 0) > 0;
  }

  /**
   * Простір: сторінки, які автори відкрили.
   *
   * Три умови, і кожна щось відсікає: `is_public` — вибір автора, `owner_id`
   * `NOT NULL` — контент платформи (він не «чужа сторінка»), а `is_blocked`
   * прибирає людей, яких платформа заблокувала: це рішення про людину, і
   * жоден її прапорець його не скасовує.
   */
  async listPublished(limit: unknown = SPACE_PAGE_SIZE): Promise<PublicPage[]> {
    await this.ensureSchema();

    const result = await this.env.DB.prepare(
      `SELECT s.id, s.slug, s.title, s.template_key, s.updated_at,
              u.user_id AS author_id, u.platform_username AS author_name,
              u.photo_url AS author_photo
         FROM scenarios s
         JOIN users u ON u.user_id = s.owner_id
        WHERE s.owner_id IS NOT NULL
          AND COALESCE(s.is_public, 0) = 1
          AND s.is_active = 1
          AND COALESCE(u.is_blocked, 0) = 0
        ORDER BY s.updated_at DESC, s.id DESC
        LIMIT ?`,
    )
      .bind(clampSpacePagesLimit(limit))
      .all<Record<string, unknown>>();

    return (result.results ?? []).map((row) => ({
      id: Number(row.id),
      slug: String(row.slug ?? ""),
      title: String(row.title ?? ""),
      template: (isPageTemplateKey(row.template_key)
        ? row.template_key
        : DEFAULT_PAGE_TEMPLATE) as PageTemplateKey,
      author: {
        id: Number(row.author_id),
        name: (row.author_name as string) ?? null,
        photoUrl: (row.author_photo as string) ?? null,
      },
      updatedAt: (row.updated_at as string) ?? "",
    }));
  }

  private async rowById(id: number): Promise<PageRow | null> {
    return await this.env.DB.prepare(`SELECT ${PAGE_COLUMNS} FROM scenarios WHERE id = ?`)
      .bind(id)
      .first<PageRow>();
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

  /** Номер рядка, який уже зайняв адресу; `exceptId` — «крім цього рядка». */
  private async addressOwner(slug: string, exceptId?: number): Promise<number | null> {
    const row = await this.env.DB.prepare(
      exceptId === undefined
        ? "SELECT id FROM scenarios WHERE slug = ? LIMIT 1"
        : "SELECT id FROM scenarios WHERE slug = ? AND id <> ? LIMIT 1",
    )
      .bind(...(exceptId === undefined ? [slug] : [slug, exceptId]))
      .first<{ id: number }>();

    return row ? Number(row.id) : null;
  }

  /**
   * Вільна адреса для нової сторінки.
   *
   * Хвіст додається, доки адреса зайнята, і **не подовжує** її за стелю
   * (`PAGE_SLUG_MAX`): обрізаний Telegram-payload веде в нікуди, і дізнатись
   * про це нічим.
   */
  private async uniqueAddress(base: string): Promise<string> {
    for (let attempt = 1; attempt <= 50; attempt++) {
      const suffix = attempt === 1 ? "" : `-${attempt}`;
      const candidate = `${base.slice(0, PAGE_SLUG_MAX - suffix.length)}${suffix}`;
      if ((await this.addressOwner(candidate)) === null) return candidate;
    }
    return `${base.slice(0, PAGE_SLUG_MAX - 6)}-${Date.now() % 100000}`;
  }
}
