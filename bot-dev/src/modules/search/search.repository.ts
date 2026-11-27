/**
 * Індекс із KV: одне читання на запит, без кешу в пам'яті — свіжість важливіша.
 * Готову відповідь пише `api-dev` по факту зміни. Деталі — `docs/SEARCH.md`.
 *
 * @module bot-dev/src/modules/search/search.repository
 */

import type { SearchIndex } from "@wwwuabot/shared/search";
import { ensureDefaultTenant } from "@wwwuabot/shared/database/tenants";
import type { Env } from "../../shared/types/env";

/** Той самий ключ, що в `api-dev`: версія одна на обидва боки. */
export function searchIndexKey(tenantId: number): string {
  return `search:v3:${tenantId}`;
}

export async function loadSearchIndex(env: Env): Promise<SearchIndex | null> {
  if (!env.CONTENT_KV) return null;
  try {
    // Бот поки обслуговує головний проєкт: маршрутизація проєктів усередині
    // бота — наступний крок, і доти його індекс — індекс `main`.
    const tenantId = await ensureDefaultTenant(env.DB);
    const index = await env.CONTENT_KV.get<SearchIndex>(searchIndexKey(tenantId), "json");
    return index && Array.isArray(index.entries) ? index : null;
  } catch {
    return null;
  }
}
