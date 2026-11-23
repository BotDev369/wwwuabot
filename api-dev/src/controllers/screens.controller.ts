/**
 * `GET /api/screens` — дерево екранів платформи, `GET /api/screens/:key` — слова
 * одного екрана.
 *
 * **Дерево, а не N запитів.** Назва, батько й місце в меню потрібні каркасові на
 * кожній навігації, а слів екранів на сторінці зазвичай одне. Тому дерево їде
 * одним запитом і кешується на сесію; окремий шлях лишається для сумісності й
 * для сторінок, які ще читають слова самі.
 *
 * @module api-dev/src/controllers/screens.controller
 */

import { isValidSlug } from "@wwwuabot/shared/content";
import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { readScreenTexts, type ScreenTexts } from "@wwwuabot/shared/screens";
import { apiLog } from "../shared/logger";
import type { Env } from "../shared/types";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Рядок екрана так, як його бачить оболонка. */
interface ScreenRow {
  key: string;
  parentKey: string | null;
  title: string;
  icon: string | null;
  sortOrder: number;
  inMenu: boolean;
  texts: ScreenTexts;
}

interface ScreenDbRow {
  key: string;
  parent_key: string | null;
  title: string;
  icon: string | null;
  sort_order: number;
  in_menu: number;
  page_data: string | null;
}

function toScreen(row: ScreenDbRow): ScreenRow {
  return {
    key: row.key,
    parentKey: row.parent_key,
    title: row.title,
    icon: row.icon,
    sortOrder: row.sort_order,
    inMenu: row.in_menu === 1,
    texts: readScreenTexts(row.page_data),
  };
}

/** Усі активні екрани: одне дерево зі словами. */
export async function handleScreens(env: Env): Promise<Response> {
  try {
    // Схему тримає реєстр таблиць, а не міграція-дані: `ensureTables` — той самий
    // шлях, яким таблицю створює решта доменів. Рядки (назви, батьки) заводить
    // seed-міграція, тож порожня таблиця — це «екранів ще немає», а не збій.
    await ensureTables(env.DB, ["platform_screens"]);
    const rows = await env.DB.prepare(
      `SELECT key, parent_key, title, icon, sort_order, in_menu, page_data
         FROM platform_screens
        WHERE is_active = 1
        ORDER BY sort_order, key`,
    ).all<ScreenDbRow>();

    return json({ ok: true, screens: (rows.results ?? []).map(toScreen) });
  } catch (e: unknown) {
    apiLog.error("Screens tree error", e);
    return json({ ok: false, error: "Internal error" }, 500);
  }
}

/**
 * Слова одного екрана.
 *
 * Фолбек на `platform_pages` — **перехідний**: екрани, чиї слова ще не
 * переїхали (7.2), лежать там, і сторінка не має втратити текст на переїзді.
 */
export async function handleScreenTexts(env: Env, key: string): Promise<Response> {
  const slug = key.trim();
  if (!isValidSlug(slug) || slug.includes("/")) {
    return json({ ok: false, error: "Bad screen key" }, 400);
  }

  try {
    await ensureTables(env.DB, ["platform_screens"]);
    const row = await env.DB.prepare(
      `SELECT page_data FROM platform_screens
        WHERE key = ? AND is_active = 1
        LIMIT 1`,
    )
      .bind(slug)
      .first<{ page_data: string | null }>();

    if (row) return json({ ok: true, key: slug, texts: readScreenTexts(row.page_data) });

    const legacy = await env.DB.prepare(
      `SELECT page_data FROM platform_pages
        WHERE slug = ? AND is_active = 1 AND owner_id IS NULL
        LIMIT 1`,
    )
      .bind(slug)
      .first<{ page_data: string | null }>();

    return json({ ok: true, key: slug, texts: readScreenTexts(legacy?.page_data ?? null) });
  } catch (e: unknown) {
    apiLog.error("Screen texts error", e);
    return json({ ok: false, error: "Internal error" }, 500);
  }
}
