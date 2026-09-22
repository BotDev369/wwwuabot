/**
 * Клієнт сторінок — форма запиту, спільна для клієнтів обох поверхонь.
 *
 * Два шляхи, і різниця між ними принципова: **свої** сторінки читаються з-під
 * підписаного `initData` (разом із неоприлюдненими), а **чужі** — публічні, і
 * власника в них не питають. Тримати це в одній функції означало б «залежить
 * від того, хто кличе», тобто правило, яке легко забути — а помилка тут
 * показала б чужі приватні сторінки.
 *
 * Транспорт передається аргументом: у кожної оболонки свої заголовки й своя
 * реакція на 401 (`AGENTS.md` §3).
 *
 * @module @wwwuabot/shared/pages
 */

import type {
  PageDeleteResponse,
  PageDraft,
  PageListResponse,
  PageSaveResponse,
  PublicPage,
  PublicPageListResponse,
  UserPage,
} from "./types";

/** Мінімум, який потрібен від транспорту оболонки. */
export interface PagesTransport {
  <T>(path: string, init?: RequestInit): Promise<T>;
}

export interface PagesApi {
  /** Власні сторінки — разом із приватними: їх треба бачити саме авторові. */
  listOwn: () => Promise<UserPage[]>;
  /** Зберегти: без `id` — нова, з `id` — правка своєї. */
  save: (draft: PageDraft) => Promise<UserPage | null>;
  /** Видалити свою за номером. Чужого номера тут бути не може: власника додає сервер. */
  remove: (id: number) => Promise<void>;
  /** Простір: сторінки, які автори відкрили. */
  published: () => Promise<PublicPage[]>;
}

/** Шляхи двох поверхонь: своє й опубліковане. */
export interface PagesApiPaths {
  own: string;
  space: string;
}

export function createPagesApi(fetchJson: PagesTransport, paths: PagesApiPaths): PagesApi {
  return {
    listOwn: async () => (await fetchJson<PageListResponse>(paths.own)).pages ?? [],
    published: async () => (await fetchJson<PublicPageListResponse>(paths.space)).pages ?? [],
    save: async (draft) =>
      (
        await fetchJson<PageSaveResponse>(paths.own, {
          method: "POST",
          body: JSON.stringify(draft),
        })
      ).page ?? null,
    remove: async (id) => {
      const response = await fetchJson<PageDeleteResponse>(`${paths.own}?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(response.error ?? "Не вдалося видалити сторінку");
    },
  };
}
