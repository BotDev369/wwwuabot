/**
 * API двох таблиць контенту для адмінки: `bot_scenarios` і `platform_pages`.
 * Важкі поля (`page_data`, `rich_data`) приходять лише при відкритті запису.
 */

import { apiFetch } from "./client";

export interface BotScenarioListItem {
  id: number;
  slug: string;
  bot_command: string | null;
  title: string | null;
  keyboard_type: string;
  is_active: number | null;
  updated_at: string;
}

export interface BotScenarioRecord extends BotScenarioListItem {
  photo_url: string | null;
  caption_top: string | null;
  caption_mid: string | null;
  caption_bot: string | null;
  buttons: string;
  awaits_input: string | null;
  input_path: string | null;
  input_next: string | null;
  price: string | null;
  qty_options: string | null;
  notify_groups: string | null;
  notify_template: string | null;
  rich_message: string | null;
  rich_data: string | null;
}

export interface PlatformPageListItem {
  id: number;
  slug: string;
  title: string | null;
  template_key: string | null;
  is_public: number | null;
  owner_id: string | null;
  updated_at: string;
}

export interface PlatformPageRecord extends PlatformPageListItem {
  photo_url: string | null;
  page_data: string | null;
  is_active: number | null;
}

export async function listBotScenarios(): Promise<BotScenarioListItem[]> {
  const res = await apiFetch<{ ok: boolean; items: BotScenarioListItem[] }>(
    "/api/admin/bot-scenarios",
  );
  return res.items;
}

export async function readBotScenario(id: number): Promise<BotScenarioRecord | null> {
  const res = await apiFetch<{ ok: boolean; item: BotScenarioRecord | null }>(
    "/api/admin/bot-scenarios/read",
    { method: "POST", body: JSON.stringify({ id }) },
  );
  return res.item;
}

export async function updateBotScenario(
  id: number,
  fields: Partial<BotScenarioRecord>,
): Promise<void> {
  await apiFetch("/api/admin/bot-scenarios/update", {
    method: "POST",
    body: JSON.stringify({ id, ...fields }),
  });
}

export async function listPlatformPages(): Promise<PlatformPageListItem[]> {
  const res = await apiFetch<{ ok: boolean; items: PlatformPageListItem[] }>(
    "/api/admin/platform-pages",
  );
  return res.items;
}

export async function readPlatformPage(id: number): Promise<PlatformPageRecord | null> {
  const res = await apiFetch<{ ok: boolean; item: PlatformPageRecord | null }>(
    "/api/admin/platform-pages/read",
    { method: "POST", body: JSON.stringify({ id }) },
  );
  return res.item;
}

export async function updatePlatformPage(
  id: number,
  fields: Partial<PlatformPageRecord>,
): Promise<void> {
  await apiFetch("/api/admin/platform-pages/update", {
    method: "POST",
    body: JSON.stringify({ id, ...fields }),
  });
}
