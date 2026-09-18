/**
 * Клієнт контактів — та сама пара «форма запиту ↔ транспорт», що в `notes`:
 * оболонка дає лише шлях і заголовки ідентичності, форма запиту живе тут.
 *
 * Власника клієнт не передає **ніколи**: на сервері його бере `resolveUserId`
 * із підписаного `initData`, тож попросити чужі контакти нічим. Готовий лінк
 * приходить із сервера (`deepLink`) — ім'я бота знає тільки він, і збирати лінк
 * у браузері означало б мати друге правило його складання.
 *
 * Створення, правка й лінк повертають **той рядок, який ліг у базу**: картка
 * малюється з відповіді, а не з припущення про те, що там тепер лежить.
 *
 * @module @wwwuabot/shared/contacts
 */

import type {
  Contact,
  ContactDeleteResponse,
  ContactInput,
  ContactListResponse,
  ContactSaveResponse,
} from "./types";

/** Мінімум, який потрібен від транспорту оболонки. */
export interface ContactsTransport {
  <T>(path: string, init?: RequestInit): Promise<T>;
}

export interface ContactsApi {
  /** Контакти людини (найсвіжіші згори). */
  list: () => Promise<Contact[]>;
  /** Створити контакт — **без лінка**: лінк це окрема дія (`makeLink`). */
  create: (input: ContactInput) => Promise<Contact | null>;
  /** Змінити всі поля контакту одразу. */
  update: (id: number, input: ContactInput) => Promise<Contact | null>;
  /** Створити або перескласти особистий лінк цього контакту. */
  makeLink: (id: number) => Promise<Contact | null>;
  /** Прибрати контакт за номером; чужий номер віддає помилку. */
  remove: (id: number) => Promise<void>;
}

/** Складає клієнт контактів для конкретного шляху. */
export function createContactsApi(fetchJson: ContactsTransport, basePath: string): ContactsApi {
  const body = (input: ContactInput): RequestInit => ({
    method: "POST",
    body: JSON.stringify(input),
  });

  return {
    list: async () => (await fetchJson<ContactListResponse>(basePath)).contacts ?? [],
    create: async (input) =>
      (await fetchJson<ContactSaveResponse>(basePath, body(input))).contact ?? null,
    update: async (id, input) =>
      (
        await fetchJson<ContactSaveResponse>(`${basePath}?id=${id}`, {
          ...body(input),
          method: "PATCH",
        })
      ).contact ?? null,
    makeLink: async (id) => {
      // Окремий шлях, а не поле форми: код складає сервер, і «оновити лінк» —
      // це окрема дія зі своїм наслідком (старий лінк перестає працювати).
      const response = await fetchJson<ContactSaveResponse>(`${basePath}/link?id=${id}`, {
        method: "POST",
      });
      return response.contact ?? null;
    },
    remove: async (id) => {
      const response = await fetchJson<ContactDeleteResponse>(`${basePath}?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(response.error ?? "Не вдалося прибрати контакт");
    },
  };
}
