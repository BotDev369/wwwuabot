/**
 * Індекс із KV: одне читання на запит, без кешу в пам'яті — свіжість важливіша.
 * Готову відповідь пише `api-dev` по факту зміни. Деталі — `docs/SEARCH.md`.
 *
 * @module bot-dev/src/modules/search/search.repository
 */

import type { SearchIndex } from "@wwwuabot/shared/search";
import type { Env } from "../../shared/types/env";

/** Той самий ключ, що в `api-dev`: версія одна на обидва боки. */
export function searchIndexKey(tenantId: number): string {
  return `search:v3:${tenantId}`;
}

/** Індекс проєкту: сусідній проєкт не має шансу потрапити у видачу. */
export async function loadSearchIndex(env: Env, tenantId: number): Promise<SearchIndex | null> {
  if (!env.CONTENT_KV) return null;
  try {
    const index = await env.CONTENT_KV.get<SearchIndex>(searchIndexKey(tenantId), "json");
    return index && Array.isArray(index.entries) ? index : null;
  } catch {
    return null;
  }
}
