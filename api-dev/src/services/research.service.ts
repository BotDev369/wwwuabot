/**
 * Каталог дослідження: KV спершу, D1 — джерело й полагодження кеша.
 *
 * @module api-dev/src/services/research.service
 */

import type { ResearchBlock, ResearchCatalog } from "@wwwuabot/shared/research";
import { RESEARCH_LANDING_SLUG, RESEARCH_TITLE } from "@wwwuabot/shared/research";
import type { Env } from "../shared/types";

/** Ключ каталогу в `CONTENT_KV`: одна версія, щоб стара форма не жила поруч. */
export const RESEARCH_CATALOG_KEY = "research:catalog:v1";

/** Префікс адрес блоків: лендінг — `viruvannia`, блоки — `viruvannia-a1`. */
const BLOCK_PREFIX = `${RESEARCH_LANDING_SLUG}-`;

/** Рядок, якого досить, коли каталогу в KV немає. */
interface BlockRow {
  slug: string;
  title: string | null;
}

/**
 * Мінімальний блок із рядка бази.
 *
 * Порожні поля тут — не недогляд: назва й адреса є завжди, решта приходить із
 * каталогу. Вигадувати `oneLiner` із нічого означало б показати людині текст,
 * якого ніхто не писав.
 */
function blockFromRow(row: BlockRow): ResearchBlock {
  const slug = String(row.slug);
  return {
    id: slug.startsWith(BLOCK_PREFIX) ? slug.slice(BLOCK_PREFIX.length) : slug,
    slug,
    group: "",
    groupTitle: "",
    title: String(row.title ?? ""),
    oneLiner: "",
    dataDate: "",
    publishedDate: "",
    dataStatus: "",
    readingTime: 0,
    keyFigures: [],
  };
}

/** Каталог: із KV, а на промаху — із рядків `scenarios` (і назад у KV). */
export async function readResearchCatalog(env: Env): Promise<ResearchCatalog | null> {
  const cached = await env.CONTENT_KV.get<ResearchCatalog>(RESEARCH_CATALOG_KEY, "json");
  if (cached && Array.isArray(cached.blocks) && cached.blocks.length > 0) return cached;

  const result = await env.DB.prepare(
    `SELECT slug, title FROM scenarios
      WHERE slug LIKE ? AND is_active = 1
      ORDER BY id`,
  )
    .bind(`${BLOCK_PREFIX}%`)
    .all<BlockRow>();

  const rows = result.results ?? [];
  if (rows.length === 0) return null;

  const catalog: ResearchCatalog = {
    title: RESEARCH_TITLE,
    slug: RESEARCH_LANDING_SLUG,
    updatedAt: "",
    blocks: rows.map(blockFromRow),
  };

  await env.CONTENT_KV.put(RESEARCH_CATALOG_KEY, JSON.stringify(catalog));
  return catalog;
}
