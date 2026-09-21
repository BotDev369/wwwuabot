/**
 * Клієнт оголошень — форма запиту, спільна для клієнтів дошки.
 *
 * Два шляхи, і це не дрібниця: **своє** й **чуже** — різні запити. Власні
 * оголошення (разом із чернетками) читаються з-під підписаного `initData`,
 * дошка — публічна, і власника в ній не питають. Тримати це в одній функції
 * означало б «залежить від того, хто кличе», тобто правило, яке легко забути.
 *
 * Транспорт передається аргументом: у кожної оболонки свої заголовки й своя
 * реакція на 401 (AGENTS.md §3).
 *
 * @module @wwwuabot/shared/ads
 */

import type {
  Ad,
  AdBoardResponse,
  AdDeleteResponse,
  AdDraft,
  AdListResponse,
  AdSaveResponse,
} from "./types";

/** Мінімум, який потрібен від транспорту оболонки. */
export interface AdsTransport {
  <T>(path: string, init?: RequestInit): Promise<T>;
}

export interface AdsApi {
  /** Власні оголошення — разом із чернетками (вони не на дошці, але потрібні). */
  listOwn: () => Promise<Ad[]>;
  /** Зберегти: без `id` — нове, з `id` — правка свого. */
  save: (draft: AdDraft) => Promise<Ad | null>;
  /** Видалити своє за номером. Чужого номера тут бути не може: власника додає сервер. */
  remove: (id: number) => Promise<void>;
  /** Дошка: те, що показали інші. Публічно, без власника в запиті. */
  board: () => Promise<Ad[]>;
}

/** Шляхи двох поверхонь: своє й чуже. */
export interface AdsApiPaths {
  own: string;
  board: string;
}

export function createAdsApi(fetchJson: AdsTransport, paths: AdsApiPaths): AdsApi {
  return {
    listOwn: async () => (await fetchJson<AdListResponse>(paths.own)).ads ?? [],
    board: async () => (await fetchJson<AdBoardResponse>(paths.board)).ads ?? [],
    save: async (draft) =>
      (
        await fetchJson<AdSaveResponse>(paths.own, {
          method: "POST",
          body: JSON.stringify(draft),
        })
      ).ad ?? null,
    remove: async (id) => {
      const response = await fetchJson<AdDeleteResponse>(`${paths.own}?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(response.error ?? "Не вдалося видалити оголошення");
    },
  };
}
