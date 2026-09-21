/**
 * Клієнт схем теми — форма запиту, спільна для оболонок.
 *
 * Два шляхи, і це не дрібниця: **своє** й **спільне** — різні запити. Власні
 * схеми (разом із закритими) читаються з-під підписаного `initData`, публічна
 * бібліотека — без авторизації, бо її вже відібрав запит до бази.
 *
 * Транспорт передається аргументом: у кожної оболонки свої заголовки й своя
 * реакція на 401 (AGENTS.md §3).
 *
 * @module @wwwuabot/shared/themes
 */

import type {
  ThemeDeleteResponse,
  ThemeListResponse,
  ThemeSaveResponse,
  ThemeScheme,
  ThemeSchemeInput,
} from "./types";

/** Мінімум, який потрібен від транспорту оболонки. */
export interface ThemesTransport {
  <T>(path: string, init?: RequestInit): Promise<T>;
}

export interface ThemesApi {
  /** Свої схеми — і закриті, і відкриті: людина має бачити всі. */
  listMine: () => Promise<ThemeScheme[]>;
  /** Спільна бібліотека: схеми, які інші зробили публічними. */
  listShared: () => Promise<ThemeScheme[]>;
  /** Зберегти: без `id` — нова, з `id` — правка своєї. */
  save: (input: ThemeSchemeInput) => Promise<ThemeScheme | null>;
  /** Прибрати свою за номером. Чужого номера тут бути не може — власника додає сервер. */
  remove: (id: number) => Promise<void>;
}

/** Шляхи двох поверхонь: своє й спільне. */
export interface ThemesApiPaths {
  mine: string;
  shared: string;
}

export function createThemesApi(fetchJson: ThemesTransport, paths: ThemesApiPaths): ThemesApi {
  return {
    listMine: async () => (await fetchJson<ThemeListResponse>(paths.mine)).themes ?? [],
    listShared: async () => (await fetchJson<ThemeListResponse>(paths.shared)).themes ?? [],
    save: async (input) =>
      (
        await fetchJson<ThemeSaveResponse>(paths.mine, {
          method: "POST",
          body: JSON.stringify(input),
        })
      ).theme ?? null,
    remove: async (id) => {
      const response = await fetchJson<ThemeDeleteResponse>(`${paths.mine}?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(response.error ?? "Не вдалося видалити тему");
    },
  };
}
