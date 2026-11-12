/**
 * Екран бота: рядок `bot_scenarios` разом із його сторінкою `platform_pages`.
 *
 * **Дві таблиці, один екран.** Подання в чаті (підписи, фото, кнопки,
 * rich-розмітка) лежить в `bot_scenarios`, а контент, назва й видимість — у
 * `platform_pages`. Читаються вони одним `JOIN` за `slug`: адреса в обох
 * таблицях та сама, і саме вона веде людину з чату на сторінку.
 *
 * **Сторінка без екрана — не помилка.** Діплінк на сторінку, у якої немає
 * власного подання в боті, показує універсальну картку: назву й фото бере
 * сторінка, кнопка одна — «Відкрити сторінку».
 *
 * **Приватна сторінка недосяжна і в боті.** Рішення ухвалює спільний
 * `pageVisibleTo` (visitor + `viewer_ids`), а не SQL: список глядачів — JSON.
 *
 * @module bot-dev/src/repositories/scenario.repository
 */

import { DatabaseRepository } from "../core/database.repository";
import {
  contentPageFromScenario,
  resolveBotPayload,
  toWebPath,
  type ContentPage,
  type ScenarioContentRow,
} from "@wwwuabot/shared/content";
import { pageViewerIds, pageVisibleTo } from "@wwwuabot/shared/pages";
import { pageBotCaption } from "../shared/utils/page-caption";
import type { Scenario, ScenarioRow } from "../shared/types/scenario";

/** Команда головного екрана: нею відкривається бот без діплінка. */
export const START_COMMAND = "/start";

/**
 * Колонки екрана й сторінки одним списком.
 *
 * `photo_url` належить екрану (банер у чаті), фото сторінки їде окремим
 * псевдонімом — воно потрібне лише картці діплінка.
 */
const SCREEN_COLUMNS = `
  b.id AS id, b.slug AS slug, b.bot_command AS bot_command,
  b.photo_url AS photo_url, b.caption_top AS caption_top, b.caption_mid AS caption_mid,
  b.caption_bot AS caption_bot, b.keyboard_type AS keyboard_type, b.buttons AS buttons,
  b.awaits_input AS awaits_input, b.input_path AS input_path, b.input_next AS input_next,
  b.price AS price, b.qty_options AS qty_options, b.notify_groups AS notify_groups,
  b.notify_template AS notify_template, b.rich_message AS rich_message,
  b.rich_data AS rich_data, b.is_active AS is_active,
  p.title AS title, p.photo_url AS page_photo_url, p.page_data AS page_data,
  p.template_key AS template_key, p.owner_id AS owner_id, p.is_public AS is_public,
  p.viewer_ids AS viewer_ids`;

const SCREEN_FROM = "FROM bot_scenarios b LEFT JOIN platform_pages p ON p.slug = b.slug";

interface GatedScenarioRow extends ScenarioRow {
  owner_id?: number | null;
  is_public?: number | null;
  viewer_ids?: string | null;
  page_photo_url?: string | null;
}

function visibleTo(row: GatedScenarioRow, userId: number | null): boolean {
  return pageVisibleTo(
    row.owner_id ?? null,
    row.is_public === 1,
    pageViewerIds(row.viewer_ids),
    userId,
  );
}

export class ScenarioRepository extends DatabaseRepository {
  async getScenario(slug: string, userId: number | null = null): Promise<Scenario | null> {
    const row = await this.db
      .prepare(`SELECT ${SCREEN_COLUMNS} ${SCREEN_FROM} WHERE b.slug = ?`)
      .bind(slug)
      .first<GatedScenarioRow>();
    if (!row || !visibleTo(row, userId)) return null;
    return this.parse(row);
  }

  async getScenarioByBotPayload(
    payload: string,
    userId: number | null = null,
  ): Promise<Scenario | null> {
    // `/start` без діплінка — це команда, а не порожня адреса: головну шукаємо
    // за `bot_command`. Якщо команду ще не проставили (старий рядок), працює
    // пошук за `HOME_SLUG` — бот не має мовчати через відсутні дані.
    if (payload.trim() === "") {
      const landing = await this.db
        .prepare(
          `SELECT ${SCREEN_COLUMNS} ${SCREEN_FROM} WHERE b.is_active = 1 AND b.bot_command = ? LIMIT 1`,
        )
        .bind(START_COMMAND)
        .first<GatedScenarioRow>();
      if (landing && visibleTo(landing, userId)) return this.parse(landing);
    }

    const result = await this.db
      .prepare(
        `SELECT id, slug, title, photo_url, page_data, is_active, owner_id, is_public, viewer_ids
         FROM platform_pages
         WHERE is_active = 1`,
      )
      .all<ScenarioContentRow & GatedScenarioRow>();
    const pages = ((result.results ?? []) as GatedScenarioRow[])
      .filter((row) => visibleTo(row, userId))
      .map(contentPageFromScenario);
    const route = resolveBotPayload(pages, payload);
    if (!route) return null;

    const scenario = await this.getScenario(route.page.slug, userId);
    if (scenario) {
      scenario.web_path = toWebPath(route.page.slug, route.params);
      return scenario;
    }

    // Подання в боті немає — сторінка все одно відкривається карткою.
    return this.pageCard(route.page, route.params);
  }

  /** Картка сторінки без власного екрана: назва й фото — зі сторінки. */
  private pageCard(page: ContentPage, params: readonly string[]): Scenario {
    return {
      id: page.id === "" ? null : Number(page.id),
      slug: page.slug,
      bot_command: null,
      title: page.title,
      photo_url: page.photoUrl ?? "",
      caption_top: null,
      caption_mid: null,
      caption_bot: null,
      keyboard_type: "static",
      buttons: [],
      awaits_input: null,
      input_path: null,
      input_next: null,
      price: null,
      qty_options: null,
      notify_groups: null,
      notify_template: null,
      rich_message: false,
      rich_data: null,
      page_data: page.content as Record<string, unknown> | null,
      web_path: toWebPath(page.slug, params),
    };
  }

  private parse(row: GatedScenarioRow): Scenario {
    let buttons: Scenario["buttons"] = [];
    try {
      const parsed: unknown = JSON.parse(row.buttons);
      if (Array.isArray(parsed)) buttons = parsed as Scenario["buttons"];
    } catch {
      console.error(`[ScenarioRepository] Invalid buttons JSON for slug="${row.slug}"`);
    }

    const richMessage = row.rich_message === "true" || row.rich_message === "1";

    let richData: Record<string, unknown>[] | null = null;
    if (row.rich_data && row.rich_data.trim() !== "") {
      try {
        const parsed: unknown = JSON.parse(row.rich_data);
        if (Array.isArray(parsed)) {
          richData = parsed as Record<string, unknown>[];
        } else {
          console.error(`[ScenarioRepository] rich_data is not an array for slug="${row.slug}"`);
        }
      } catch {
        console.error(`[ScenarioRepository] Invalid rich_data JSON for slug="${row.slug}"`);
      }
    }

    const page = contentPageFromScenario({
      id: row.id ?? null,
      slug: row.slug,
      title: row.title,
      photo_url: row.page_photo_url ?? null,
      page_data: row.page_data,
      is_active: 1,
    } satisfies ScenarioContentRow);

    return {
      id: row.id ?? null,
      slug: page.slug,
      bot_command: row.bot_command ?? null,
      title: page.title,
      photo_url: row.photo_url,
      // Сторінка з шаблону не має власного підпису — його виводить
      // `pageBotCaption` із того самого `page_data`, який рендерить веб.
      caption_top:
        row.caption_top ??
        pageBotCaption({
          template_key: row.template_key,
          page_data: row.page_data,
          captions: [row.caption_top, row.caption_mid, row.caption_bot],
        }),
      caption_mid: row.caption_mid,
      caption_bot: row.caption_bot,
      keyboard_type: row.keyboard_type,
      buttons,
      awaits_input: row.awaits_input,
      input_path: row.input_path,
      input_next: row.input_next,
      price: row.price ? Number(row.price) : null,
      qty_options: row.qty_options,
      notify_groups: row.notify_groups,
      notify_template: row.notify_template,
      rich_message: richMessage,
      rich_data: richData,
      page_data: page.content as Record<string, unknown> | null,
    };
  }
}
