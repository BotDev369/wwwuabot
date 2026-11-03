/**
 * Старі адреси сторінок: `slug_aliases` — `alias` → `slug`. Переїзд лишає
 * рядок, а не 404; читають його веб-воркер (`301`) і `handleScenario`.
 * Ланцюжків немає: `moveAliases` переписує цілі, тож alias веде на поточну
 * адресу (`docs/URL.md` §4).
 *
 * @module api-dev/src/services/aliases.service
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { normalizeSlug } from "@wwwuabot/shared/content";

/** Скільки рядків-адрес може лишити по собі одна сторінка. */
export const ALIAS_LIMIT = 20;

/**
 * Адреса, яку сторінка мала раніше. `null` — alias невідомий, вести нікуди.
 *
 * Перевіряємо й те, що ціль жива (`is_active = 1`): інакше редирект вів би у
 * порожнечу, і людина бачила б не «сторінка переїхала», а битий шлях.
 */
export async function redirectTargetFor(db: D1Database, path: unknown): Promise<string | null> {
  const alias = normalizeSlug(typeof path === "string" ? path : "");
  if (alias === "") return null;

  await ensureTables(db, ["slug_aliases"]);

  const row = await db
    .prepare(
      `SELECT a.slug AS slug FROM slug_aliases a
         JOIN scenarios s ON s.slug = a.slug
        WHERE a.alias = ? AND s.is_active = 1
        LIMIT 1`,
    )
    .bind(alias)
    .first<{ slug: string }>();

  const slug = normalizeSlug(row?.slug ?? "");
  return slug === "" || slug === alias ? null : slug;
}

/** Рядки, що вели на стару адресу, тепер ведуть на нову: ланцюжків не лишається. */
export async function moveAliases(db: D1Database, from: string, to: string): Promise<void> {
  await ensureTables(db, ["slug_aliases"]);
  await db.prepare("UPDATE slug_aliases SET slug = ? WHERE slug = ?").bind(to, from).run();
}

/**
 * Запам'ятати, що сторінка була за адресою `from`.
 *
 * `INSERT OR REPLACE` — бо alias — це ключ: адресу могли вже займати раніше (і
 * повернути її знову), і тоді правильна та адреса, яку сторінка має **зараз**.
 * Замість `moveAliases` тут не обійтись: переносить воно цілі, а не джерела.
 */
export async function rememberAlias(db: D1Database, from: string, to: string): Promise<void> {
  const alias = normalizeSlug(from);
  const slug = normalizeSlug(to);
  if (alias === "" || alias === slug) return;

  await ensureTables(db, ["slug_aliases"]);
  await db
    .prepare("INSERT OR REPLACE INTO slug_aliases (alias, slug) VALUES (?, ?)")
    .bind(alias, slug)
    .run();

  await db
    .prepare(
      `DELETE FROM slug_aliases WHERE alias IN (
         SELECT alias FROM slug_aliases ORDER BY created_at DESC LIMIT -1 OFFSET ?
       )`,
    )
    .bind(ALIAS_LIMIT)
    .run();
}
