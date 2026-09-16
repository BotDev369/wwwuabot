/**
 * Клієнт нотаток, спільний для обох оболонок.
 *
 * Оболонки відрізняються **лише шляхом**: у платформі це `/api/notes`
 * (ідентичність із підписаного `initData`), у панелі — `/api/admin/notes`
 * (cookie-сесія). Форма запиту й відповіді одна, тож і жити вона мусить в
 * одному місці: інакше «що саме надсилати» буде написано двічі, і перша ж
 * зміна поля розійде їх тихо.
 *
 * Транспорт передається аргументом (`apiFetch` кожної оболонки), бо в нього
 * різні заголовки й різна реакція на 401 — це саме та межа, яку ділити не
 * можна (AGENTS.md §3).
 *
 * @module @wwwuabot/shared/notes
 */

import type {
  NoteDeleteResponse,
  NoteDraft,
  NoteListResponse,
  NoteRow,
  NoteSaveResponse,
} from "./types";

/** Мінімум, який потрібен від транспорту оболонки. */
export interface NotesTransport {
  <T>(path: string, init?: RequestInit): Promise<T>;
}

export interface NotesApi {
  /** Власні нотатки (спочатку свіжі). */
  list: () => Promise<NoteRow[]>;
  /** Зберегти чернетку: без `id` — нова, з `id` — правка своєї. */
  save: (draft: NoteDraft) => Promise<NoteRow | null>;
  /**
   * Видалити свою нотатку за номером.
   *
   * Чужого номера тут бути **не може**: власника додає сервер із тієї ж
   * ідентичності, що й читання, а не клієнт. Невідомий (або чужий) номер
   * віддає помилку — мовчазне «нічого не сталось» виглядало б як успіх.
   */
  remove: (id: number) => Promise<void>;
}

/** Складає клієнт нотаток для конкретного шляху. */
export function createNotesApi(fetchJson: NotesTransport, basePath: string): NotesApi {
  return {
    list: async () => (await fetchJson<NoteListResponse>(basePath)).notes ?? [],
    save: async (draft) =>
      (
        await fetchJson<NoteSaveResponse>(basePath, {
          method: "POST",
          body: JSON.stringify(draft),
        })
      ).note ?? null,
    remove: async (id) => {
      const response = await fetchJson<NoteDeleteResponse>(`${basePath}?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(response.error ?? "Не вдалося видалити нотатку");
    },
  };
}
