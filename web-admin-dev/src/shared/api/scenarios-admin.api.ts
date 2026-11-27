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
  search_terms: string | null;
  is_active: number | null;
}

/** `?tenant=<key>` — чий проєкт; без нього адмін-шлях читає головний. */
function withTenant(path: string, tenant?: string): string {
  return tenant ? `${path}?tenant=${encodeURIComponent(tenant)}` : path;
}

/** Що повертає ручна перебудова пошуку. */
export interface SearchReindexResult {
  pages: number;
  products: number;
  builtAt: string;
}

export async function listBotScenarios(tenant?: string): Promise<BotScenarioListItem[]> {
  const res = await apiFetch<{ ok: boolean; items: BotScenarioListItem[] }>(
    withTenant("/api/admin/bot-scenarios", tenant),
  );
  return res.items;
}

export async function readBotScenario(
  id: number,
  tenant?: string,
): Promise<BotScenarioRecord | null> {
  const res = await apiFetch<{ ok: boolean; item: BotScenarioRecord | null }>(
    withTenant("/api/admin/bot-scenarios/read", tenant),
    { method: "POST", body: JSON.stringify({ id }) },
  );
  return res.item;
}

export async function updateBotScenario(
  id: number,
  fields: Partial<BotScenarioRecord>,
  tenant?: string,
): Promise<void> {
  await apiFetch(withTenant("/api/admin/bot-scenarios/update", tenant), {
    method: "POST",
    body: JSON.stringify({ id, ...fields }),
  });
}

export async function createBotScenario(
  lookup: string,
  fields: Partial<BotScenarioRecord>,
  tenant?: string,
): Promise<BotScenarioRecord> {
  const res = await apiFetch<{ ok: boolean; item: BotScenarioRecord }>(
    withTenant("/api/admin/bot-scenarios/create", tenant),
    { method: "POST", body: JSON.stringify({ lookup, ...fields }) },
  );
  return res.item;
}

export async function listPlatformPages(tenant?: string): Promise<PlatformPageListItem[]> {
  const res = await apiFetch<{ ok: boolean; items: PlatformPageListItem[] }>(
    withTenant("/api/admin/platform-pages", tenant),
  );
  return res.items;
}

export async function reindexSearch(tenant?: string): Promise<SearchReindexResult> {
  const res = await apiFetch<{ ok: boolean } & SearchReindexResult>(
    withTenant("/api/admin/search/reindex", tenant),
    { method: "POST" },
  );
  return res;
}

export async function readPlatformPage(
  id: number,
  tenant?: string,
): Promise<PlatformPageRecord | null> {
  const res = await apiFetch<{ ok: boolean; item: PlatformPageRecord | null }>(
    withTenant("/api/admin/platform-pages/read", tenant),
    { method: "POST", body: JSON.stringify({ id }) },
  );
  return res.item;
}
