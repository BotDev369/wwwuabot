/**
 * Сторінки, які створила людина: власний список і те, що показано в Просторі.
 *
 * **Сховище — `scenarios`, тобто та сама таблиця контенту.** Сторінка людини не
 * окрема сутність: у неї та сама адреса (`slug`) і те саме `page_data`, яке
 * рендерить `PageRenderer` і читає бот. Друга таблиця дала б друге сховище
 * одного `PageConfig` і другу реалізацію правила «яка сторінка для цього URL»
 * (`AGENTS.md` §7). Тому тут немає жодного `CREATE TABLE` — лише робота з
 * колонками `owner_id`, `is_public` і `template_key`.
 *
 * **Власник стоїть у самому запиті** (`WHERE owner_id = ?`), а не окремою
 * перевіркою «а це моє?»: перевірку легко забути на новому шляху, а умову в
 * `WHERE` — ні. З тієї ж причини немає різних відповідей для «немає» та
 * «чуже»: обидві — `not_found`, бо код відповіді теж витік.
 *
 * **Публічність відбирає запит, а не розмітка.** Приватна сторінка не
 * дістається ні списком, ні за адресою (`listPublished` і
 * `scenarios.controller`), тож перемикач «публічно / приватно» не можна
 * обійти посиланням — та сама межа, що в публічного профілю (`docs/SPACE.md`).
 *
 * @module api-dev/src/services/pages.service
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { parsePageConfig } from "@wwwuabot/shared/types/page-config";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import {
  DEFAULT_PAGE_TEMPLATE,
  PAGE_SLUG_MAX,
  buildPageConfig,
  isPageTemplateKey,
  pageTemplate,
  pageTitle,
  readPageValues,
  type PageDraftInput,
  type PageFieldValues,
  type PageTemplate,
  type PageTemplateKey,
  type PublicPage,
  type UserPage,
} from "@wwwuabot/shared/pages";
import type { Env } from "../shared/types";

/** Стеля власного списку: сторінок у людини не буває тисяча. */
const OWN_LIMIT = 100;

/** Скільки сторінок віддає Простір за раз і яка межа запиту. */
export const SPACE_PAGE_SIZE = 60;
const SPACE_PAGE_MAX = 100;

/** Колонки читаємо за іменами, а не `SELECT *` (AGENTS.md §7). */
const COLUMNS = "id, slug, title, page_data, template_key, is_public, updated_at";

interface PageRow {
  id: number;
  slug: string;
  title: string | null;
  page_data: string | null;
  template_key: string | null;
  is_public: number | null;
  updated_at: string | null;
}

/** Що сталося зі збереженням: контролер перекладає це в код відповіді. */
export type PageSaveOutcome =
  | { kind: "saved"; page: UserPage }
  | { kind: "not_found" }
  | { kind: "address_taken" };

/** Невідомий ключ шаблону читається як типовий: сторінка все одно відкривається. */
function templateOf(row: PageRow): PageTemplate {
  return pageTemplate(isPageTemplateKey(row.template_key) ? row.template_key : DEFAULT_PAGE_TEMPLATE);
}

/** Рядок бази → сторінка для клієнта. Значення виводяться з `page_data`. */
function toPage(row: PageRow): UserPage {
  const template = templateOf(row);
  const values: PageFieldValues = readPageValues(template, parsePageConfig(row.page_data));

  return {
    id: Number(row.id),
    slug: row.slug,
    title: row.title ?? pageTitle(template, values),
    template: template.key,
    values,
    // Колонка додана наявній таблиці, тож у старих рядків там `NULL`, а не `0`.
    isPublic: Number(row.is_public ?? 0) === 1,
    updatedAt: row.updated_at ?? "",
  };
}

/** Скільки віддавати за запитом: сміття й перебір дають межі, а не помилку. */
export function clampSpacePagesLimit(raw: unknown): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return SPACE_PAGE_SIZE;
  return Math.min(Math.floor(value), SPACE_PAGE_MAX);
}

export class PagesService {
  constructor(private env: Env) {}

  private async ensureSchema(): Promise<void> {
    await ensureTables(this.env.DB, ["scenarios"]);
  }

  /** Власні сторінки — разом із приватними: людина має їх бачити. */
  async listOwn(ownerId: number): Promise<UserPage[]> {
    await this.ensureSchema();

    const result = await this.env.DB.prepare(
      `SELECT ${COLUMNS} FROM scenarios
        WHERE owner_id = ?
        ORDER BY updated_at DESC, id DESC LIMIT ?`,
    )
      .bind(ownerId, OWN_LIMIT)
      .all<PageRow>();

    return (result.results ?? []).map(toPage);
  }

  /** Одна власна сторінка; чужий номер поводиться як неіснуючий. */
  async readOwn(id: number, ownerId: number): Promise<UserPage | null> {
    const row = await this.rowOwn(id, ownerId);
    return row ? toPage(row) : null;
  }

  /**
   * Запис: `id` є — правка своєї, немає — нова.
   *
   * **Адресу не підмінюємо мовчки.** Якщо людина змінила адресу на зайняту,
   * це відмова (`address_taken`), а не «…-2»: посилання, яке вона запам'ятала,
   * повело б в інше місце. А от коли адреса вільна — зайняти її можна: саме
   * тому при **створенні** вільний варіант шукає `uniqueAddress`, а не
   * відмова.
   */
  async save(ownerId: number, input: PageDraftInput, id?: number): Promise<PageSaveOutcome> {
    await this.ensureSchema();

    const template = pageTemplate(input.template);
    const now = formatSqliteDatetime();
    const title = pageTitle(template, input.values);
    const pageData = JSON.stringify(buildPageConfig(template, input.values));
    const isPublic = input.isPublic ? 1 : 0;

    if (id !== undefined) {
      const current = await this.rowOwn(id, ownerId);
      if (!current) return { kind: "not_found" };
      if (current.slug !== input.address) {
        const taken = await this.addressOwner(input.address, id);
        if (taken) return { kind: "address_taken" };
      }

      await this.env.DB.prepare(
        `UPDATE scenarios
            SET slug = ?, title = ?, page_data = ?, template_key = ?, is_public = ?, updated_at = ?
          WHERE id = ? AND owner_id = ?`,
      )
        .bind(input.address, title, pageData, template.key, isPublic, now, id, ownerId)
        .run();

      const page = await this.readOwn(id, ownerId);
      return page ? { kind: "saved", page } : { kind: "not_found" };
    }

    const slug = await this.uniqueAddress(input.address);
    const inserted = await this.env.DB.prepare(
      `INSERT INTO scenarios
         (slug, title, page_data, template_key, is_public, owner_id, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    )
      .bind(slug, title, pageData, template.key, isPublic, ownerId, now, now)
      .run();

    const page = await this.readOwn(inserted.meta?.last_row_id ?? 0, ownerId);
    return page ? { kind: "saved", page } : { kind: "not_found" };
  }

  /** Видалення свого; `false` — рядка не було або він чужий. */
  async remove(id: number, ownerId: number): Promise<boolean> {
    await this.ensureSchema();

    const result = await this.env.DB.prepare(
      "DELETE FROM scenarios WHERE id = ? AND owner_id = ?",
    )
      .bind(id, ownerId)
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

  private async rowOwn(id: number, ownerId: number): Promise<PageRow | null> {
    return await this.env.DB.prepare(
      `SELECT ${COLUMNS} FROM scenarios WHERE id = ? AND owner_id = ?`,
    )
      .bind(id, ownerId)
      .first<PageRow>();
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
