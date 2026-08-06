import { DatabaseRepository } from "../core/database.repository";
import type { Scenario, ScenarioRow } from "../shared/types/scenario";

export class ScenarioRepository extends DatabaseRepository {
  async getScenario(codeword: string): Promise<Scenario | null> {
    const row = await this.db
      .prepare(`SELECT * FROM scenarios WHERE codeword = ?`)
      .bind(codeword)
      .first<ScenarioRow>();
    if (!row) return null;
    return this.parse(row);
  }

  private parse(row: ScenarioRow): Scenario {
    let buttons: Scenario["buttons"] = [];
    try {
      buttons = JSON.parse(row.buttons);
    } catch {
      console.error(`[ScenarioRepository] Invalid buttons JSON for codeword="${row.codeword}"`);
    }

    // Парсимо rich_message
    const richMessage = row.rich_message === "true" || row.rich_message === "1";

    // Парсимо rich_data
    let richData: any[] | null = null;
    if (row.rich_data && row.rich_data.trim() !== "") {
      try {
        const parsed = JSON.parse(row.rich_data);
        if (Array.isArray(parsed)) {
          richData = parsed;
        } else {
          console.error(`[ScenarioRepository] rich_data is not an array for codeword="${row.codeword}"`);
        }
      } catch {
        console.error(`[ScenarioRepository] Invalid rich_data JSON for codeword="${row.codeword}"`);
      }
    }

    return {
      codeword: row.codeword,
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
    };
  }
}