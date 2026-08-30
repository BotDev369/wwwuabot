export interface ScenarioRow {
  codeword: string;
  title: string | null;
  photo_url: string;
  caption_top: string | null;
  caption_mid: string | null;
  caption_bot: string | null;
  keyboard_type: string;
  buttons: string;
  awaits_input: string | null;
  input_path: string | null;
  input_next: string | null;
  price: string | null;
  qty_options: string | null;
  notify_groups: string | null;
  notify_template: string | null;
  rich_message: string | null; // ← NEW: "true"/"false" або 1/0
  rich_data: string | null; // ← NEW: JSON-рядок з масивом блоків
  page_data: string | null; // ← NEW: JSON-рядок конфігурації веб-сторінки (Page Builder)
  created_at: string;
  updated_at: string;
}

export interface ScenarioButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface Scenario {
  codeword: string;
  title: string | null;
  photo_url: string;
  caption_top: string | null;
  caption_mid: string | null;
  caption_bot: string | null;
  keyboard_type: string;
  buttons: ScenarioButton[][];
  awaits_input: string | null;
  input_path: string | null;
  input_next: string | null;
  price: number | null;
  qty_options: string | null;
  notify_groups: string | null;
  notify_template: string | null;
  rich_message: boolean; // ← NEW
  rich_data: any[] | null; // ← NEW: масив блоків
  page_data: Record<string, unknown> | null; // ← NEW: конфігурація веб-сторінки (Page Builder)
}
