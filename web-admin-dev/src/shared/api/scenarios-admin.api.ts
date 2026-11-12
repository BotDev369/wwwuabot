/**
 * API сценаріїв бота (віджет або rich) і сторінок платформи.
 *
 * Сценарій бота шукається одним ключем `lookup` і не пов'язаний зі сторінками
 * платформи: це два незалежні екрани адмінки.
 *
 * @module web-admin-dev/src/shared/api/scenarios-admin.api
 */

import { apiFetch } from "./client";

export type ScenarioKind = "widget" | "rich";

export interface BotScenarioListItem {
  id: number;
  lookup: string;
  kind: ScenarioKind;
  is_active: number | null;
  updated_at: string;
}

export interface BotScenarioRecord extends BotScenarioListItem {
  widget_html: string | null;
  widget_data: string | null;
  rich_html: string | null;
  notify_groups: string | null;
  notify_template: string | null;
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
