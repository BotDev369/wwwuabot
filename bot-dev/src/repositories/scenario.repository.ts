import { DatabaseRepository } from "../core/database.repository";
import {
  contentPageFromScenario,
  resolveBotPayload,
  toWebPath,
  type ScenarioContentRow,
} from "@wwwuabot/shared/content";
import type { Scenario, ScenarioRow } from "../shared/types/scenario";

export class ScenarioRepository extends DatabaseRepository {
  async getScenario(slug: string): Promise<Scenario | null> {
    const row = await this.db
      .prepare(`SELECT * FROM scenarios WHERE slug = ?`)
      .bind(slug)
      .first<ScenarioRow>();
    return row ? this.parse(row) : null;
  }

  async getScenarioByBotPayload(payload: string): Promise<Scenario | null> {
    const result = await this.db
      .prepare(
        `SELECT slug, title, photo_url, page_data, is_active
         FROM scenarios
         WHERE is_active = 1`,
      )
      .all<ScenarioContentRow>();
    const pages = (result.results ?? []).map(contentPageFromScenario);
    const route = resolveBotPayload(pages, payload);
    if (!route) return null;

    const scenario = await this.getScenario(route.page.slug);
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
      slug: row.slug,
      title: row.title,
      photo_url: row.photo_url,
      page_data: row.page_data,
      is_active: 1,
    } satisfies ScenarioContentRow);

    return {
      slug: page.slug,
      title: page.title,
      photo_url: row.photo_url,
      caption_top: row.caption_top,
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
