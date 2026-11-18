/**
 * Клієнт сценаріїв, які веде людина, — форма запиту, спільна для обох
 * поверхонь.
 *
 * Один шлях: **свої** рядки читаються з-під підписаного `initData` (разом із
 * неоприлюдненими). Публічного списку немає: чужі сторінки відкривають за
 * адресою, а не списком.
 *
 * Транспорт передається аргументом: у кожної оболонки свої заголовки й своя
 * реакція на 401 (`AGENTS.md` §3).
 *
 * @module @wwwuabot/shared/pages
 */

import type { ManagedScenario, PageListResponse } from "./types";

/** Мінімум, який потрібен від транспорту оболонки. */
export interface PagesTransport {
  <T>(path: string, init?: RequestInit): Promise<T>;
}

export interface PagesApi {
  /** Сценарії, які веде людина, — разом із тими, що не оприлюднені. */
  listOwn: () => Promise<ManagedScenario[]>;
}

/** Шлях своїх рядків: власника бере підписаний `initData`, не клієнт. */
export interface PagesApiPaths {
  own: string;
}

export function createPagesApi(fetchJson: PagesTransport, paths: PagesApiPaths): PagesApi {
  return {
    listOwn: async () => (await fetchJson<PageListResponse>(paths.own)).pages ?? [],
  };
}
