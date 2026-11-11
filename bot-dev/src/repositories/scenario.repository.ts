import { DatabaseRepository } from "../core/database.repository";
import {
  contentPageFromScenario,
  resolveBotPayload,
  toWebPath,
  type ScenarioContentRow,
} from "@wwwuabot/shared/content";
import { pageViewerIds, pageVisibleTo } from "@wwwuabot/shared/pages";
import { pageBotCaption } from "../shared/utils/page-caption";
import type { Scenario, ScenarioRow } from "../shared/types/scenario";

/**
 * Видно назовні лише те, що показано.
 *
 * Сторінки людини живуть у тій самій таблиці (`owner_id`, `is_public`), і
 * приватна мусить бути недосяжною **і в боті**: бот — такий самий публічний
 * вхід, як і веб, тож «приватна» сторінка, яка відкривається діплінком, була б
 * кнопкою, яка бреше (`docs/VISIBILITY.md`). Умова та сама, що в
 * `api-dev/src/controllers/scenarios.controller.ts`, і ухвалює її спільний
 * `pageVisibleTo`: `viewer_ids` — JSON-колонка, тож SQL лише звужує вибірку.
 */
interface GatedScenarioRow extends ScenarioRow {
  owner_id?: number | null;
  is_public?: number | null;
  viewer_ids?: string | null;
}

function visibleTo(row: GatedScenarioRow, userId: number | null): boolean {
  return pageVisibleTo(
    row.owner_id ?? null,
    row.is_public === 1,
    pageViewerIds(row.viewer_ids),
    userId,
  );
}

/** Команда головного екрана: нею відкривається бот без діплінка. */
export const START_COMMAND = "/start";

export class ScenarioRepository extends DatabaseRepository {
  async getScenario(slug: string, userId: number | null = null): Promise<Scenario | null> {
    const row = await this.db
      .prepare("SELECT * FROM scenarios WHERE slug = ?")
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
    // за `bot_command`, і саме тому в базі вона записана як `/start`. Якщо
    // команду ще не проставили (старий рядок), працює старий пошук за
    // `HOME_SLUG` — бот не має мовчати через відсутню колонку в даних.
    if (payload.trim() === "") {
      const landing = await this.db
        .prepare("SELECT * FROM scenarios WHERE is_active = 1 AND bot_command = ? LIMIT 1")
        .bind(START_COMMAND)
        .first<GatedScenarioRow>();
      if (landing && visibleTo(landing, userId)) return this.parse(landing);
    }

    const result = await this.db
      .prepare(
        `SELECT id, slug, title, photo_url, page_data, is_active, owner_id, is_public, viewer_ids
         FROM scenarios
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
    }
    return scenario;
  }

  private parse(row: ScenarioRow): Scenario {
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
      photo_url: row.photo_url,
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
