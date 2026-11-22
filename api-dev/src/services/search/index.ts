/**
 * Пошуковий індекс: сторінки й товари → один ключ `search:v1` у KV.
 * Видимість відбирає запит (публічні сторінки, активні товари відкритих магазинів);
 * перебудова — лише по факту зміни, без розкладу. Деталі — `docs/SEARCH.md`.
 *
 * @module api-dev/src/services/search
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { toWebPath } from "@wwwuabot/shared/content";
import { mediaUrl } from "@wwwuabot/shared/shop";
import { searchTermsFrom, type SearchEntry, type SearchIndex } from "@wwwuabot/shared/search";
import type { Env } from "../../shared/types";

/** Один ключ на всю версію: стара форма не живе поруч із новою. */
export const SEARCH_INDEX_KEY = "search:v1";

/** Заглушки лежать у тому самому бакеті, під префіксом `shop/`. */
const DEFAULT_PAGE_PHOTO = "shop/defaults/page.webp";
const DEFAULT_PRODUCT_PHOTO = "shop/defaults/product.webp";

const TEMPLATE_LABELS: Record<string, string> = {
  shop: "Магазин",
  research: "Дослідження",
  article: "Стаття",
  screen: "Розділ",
};

interface PageRow {
  slug: string;
  title: string | null;
  photo_url: string | null;
  template_key: string | null;
  search_terms: string | null;
}

interface ProductRow {
  id: number;
  slug: string;
  title: string | null;
  summary: string | null;
  price: string | null;
  images: string | null;
  search_terms: string | null;
  shop_slug: string;
  shop_title: string | null;
}

function terms(raw: string | null, title: string, slug: string): string[] {
  try {
    const parsed = JSON.parse(raw ?? "[]") as unknown;
    if (Array.isArray(parsed)) {
      const list = parsed
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);
      if (list.length > 0) return list;
    }
  } catch {
    // Битий JSON — це не привід втратити рядок: нижче його врятують слова з назви.
  }
  return searchTermsFrom(title, slug);
}

function imageIds(raw: string | null): number[] {
  try {
    const parsed = JSON.parse(raw ?? "[]") as unknown;
    return Array.isArray(parsed)
      ? parsed.map(Number).filter((id) => Number.isInteger(id) && id > 0)
      : [];
  } catch {
    return [];
  }
}

/** Фото беремо лише зі свого шлюзу: чужі адреси Telegram може не завантажити. */
function ownPhoto(url: string | null | undefined): string | null {
  return typeof url === "string" && url.includes("/api/shop/media/") ? url : null;
}

function absolute(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}${path}`;
}

/**
 * Зібрати індекс із бази. `base` — публічна адреса `api-dev`, з якої Telegram
 * тягне фото: у рядках лежить ключ R2, а не адреса.
 */
export async function buildSearchIndex(env: Env, base: string): Promise<SearchIndex> {
  await ensureTables(env.DB, ["platform_pages", "shop_products"]);

  const pagesResult = await env.DB.prepare(
    `SELECT p.slug, p.title, p.photo_url, p.template_key, p.search_terms
       FROM platform_pages p
      WHERE p.is_active = 1 AND p.is_public = 1
        AND NOT EXISTS (
          SELECT 1 FROM users u
           WHERE CAST(u.user_id AS TEXT) = p.owner_id AND u.is_blocked = 1
        )
      ORDER BY p.id`,
  ).all<PageRow>();

  const pages: SearchEntry[] = (pagesResult.results ?? []).map((row) => {
    const title = row.title ?? row.slug;
    const photo = ownPhoto(row.photo_url) ?? absolute(base, mediaUrl(DEFAULT_PAGE_PHOTO));
    return {
      kind: "page",
      slug: row.slug,
      title,
      subtitle: TEMPLATE_LABELS[row.template_key ?? ""] ?? "Сторінка",
      photo,
      terms: terms(row.search_terms, title, row.slug),
      href: toWebPath(row.slug),
    };
  });

  const productsResult = await env.DB.prepare(
    `SELECT p.id, p.slug, p.title, p.summary, p.price, p.images, p.search_terms,
            s.slug AS shop_slug, s.title AS shop_title
       FROM shop_products p
       JOIN platform_pages s ON s.id = p.shop_id
      WHERE p.is_active = 1 AND s.is_active = 1 AND s.is_public = 1
        AND NOT EXISTS (
          SELECT 1 FROM users u
           WHERE CAST(u.user_id AS TEXT) = s.owner_id AND u.is_blocked = 1
        )
      ORDER BY p.id`,
  ).all<ProductRow>();

  const rows = productsResult.results ?? [];
  const ids = [...new Set(rows.flatMap((row) => imageIds(row.images)))];
  const keys = new Map<number, string>();
  if (ids.length > 0) {
    const media = await env.DB.prepare(
      `SELECT id, r2_key FROM shop_media WHERE id IN (${ids.map(() => "?").join(", ")})`,
    )
      .bind(...ids)
      .all<{ id: number; r2_key: string }>();
    for (const row of media.results ?? []) keys.set(Number(row.id), row.r2_key);
  }

  const products: SearchEntry[] = rows.map((row) => {
    const title = row.title ?? row.slug;
    const cover = keys.get(imageIds(row.images)[0] ?? 0);
    return {
      kind: "product",
      slug: row.slug,
      shopSlug: row.shop_slug,
      title,
      subtitle: row.shop_title ?? row.shop_slug,
      price: row.price ?? "",
      photo: cover
        ? absolute(base, mediaUrl(cover))
        : absolute(base, mediaUrl(DEFAULT_PRODUCT_PHOTO)),
      terms: terms(row.search_terms, title, row.slug),
      href: toWebPath(row.shop_slug, ["p", row.slug]),
    };
  });

  return { builtAt: new Date().toISOString(), entries: [...pages, ...products] };
}

/** Перебудувати й записати. Помилку бачить той, хто кличе: це не фонова дія. */
export async function rebuildSearchIndex(
  env: Env,
  base: string,
): Promise<{ pages: number; products: number; builtAt: string }> {
  const index = await buildSearchIndex(env, base);
  await env.CONTENT_KV.put(SEARCH_INDEX_KEY, JSON.stringify(index));
  return {
    pages: index.entries.filter((entry) => entry.kind === "page").length,
    products: index.entries.filter((entry) => entry.kind === "product").length,
    builtAt: index.builtAt,
  };
}
