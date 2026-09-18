/**
 * Клієнт контактів — та сама пара «форма запиту ↔ транспорт», що в `notes`:
 * оболонка дає лише шлях і заголовки ідентичності, форма запиту живе тут.
 *
 * Створення й перейменування повертають **той рядок, який ліг у базу**: картка
 * малюється з відповіді, а не з припущення про те, що там тепер лежить.
 *
 * Власника клієнт не передає **ніколи**: на сервері його бере
 * `resolveUserId` із підписаного `initData`, тож попросити чужі лінки нічим.
 * Лінк приходить із сервера вже зібраним (`deepLink`) — ім'я бота знає тільки
 * він, і збирати лінк у браузері означало б мати друге правило його складання.
 *
 * @module @wwwuabot/shared/invites
 */

import type {
  InviteDeleteResponse,
  InviteLink,
  InviteListResponse,
  InviteSaveResponse,
} from "./types";

/** Мінімум, який потрібен від транспорту оболонки. */
export interface InvitesTransport {
  <T>(path: string, init?: RequestInit): Promise<T>;
}

export interface InvitesApi {
  /** Особисті лінки людини (найсвіжіші згори). */
  list: () => Promise<InviteLink[]>;
  /** Створити контакт із цим підписом — разом із його лінком. */
  create: (label: string) => Promise<InviteLink | null>;
  /** Перейменувати свій контакт: новий підпис замість старого. */
  rename: (id: number, label: string) => Promise<InviteLink | null>;
  /** Прибрати свій контакт за номером; чужий номер віддає помилку. */
  remove: (id: number) => Promise<void>;
}

/** Складає клієнт лінків для конкретного шляху. */
export function createInvitesApi(fetchJson: InvitesTransport, basePath: string): InvitesApi {
  return {
    list: async () => (await fetchJson<InviteListResponse>(basePath)).links ?? [],
    create: async (label) =>
      (
        await fetchJson<InviteSaveResponse>(basePath, {
          method: "POST",
          body: JSON.stringify({ label }),
        })
      ).link ?? null,
    rename: async (id, label) =>
      (
        await fetchJson<InviteSaveResponse>(`${basePath}?id=${id}`, {
          method: "PATCH",
          body: JSON.stringify({ label }),
        })
      ).link ?? null,
    remove: async (id) => {
      const response = await fetchJson<InviteDeleteResponse>(`${basePath}?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(response.error ?? "Не вдалося прибрати лінк");
    },
  };
}
