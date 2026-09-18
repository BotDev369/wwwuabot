/**
 * Контакти людини — дані для екрана «Контакти».
 *
 * Джерело — `GET /api/contacts`: ідентичність там беруть із підписаного
 * `initData`, тож клієнт не передає жодного `user_id` і не може попросити чужі
 * контакти.
 *
 * **Оновлюємо локально, а не повторним запитом.** Сервер уже віддає створений,
 * змінений і залінкований рядок і підтверджує зникнення — другий похід по весь
 * список показав би те саме з затримкою (список «блимнув» би завантаженням
 * після кожного дотику).
 *
 * Чотири дії тут — рівно те, що вміє контакт: створити, змінити, скласти лінк,
 * прибрати. Лінк **не** створюється разом із контактом: контакт може бути
 * людиною, яку власник уже знає, і надсилати їй посилання нема причини.
 *
 * @module web-platform-dev/src/pages/useContacts
 */

import { useCallback, useEffect, useState } from "react";
import type { Contact, ContactInput } from "@wwwuabot/shared/contacts";
import { contactsApi } from "@/shared/api/contacts.api";

export interface ContactsState {
  contacts: Contact[];
  loading: boolean;
  error: string | null;
  /** Створити контакт (без лінка) — повертає той рядок, який ліг у базу. */
  create: (input: ContactInput) => Promise<Contact>;
  /** Змінити всі поля контакту одразу. */
  update: (id: number, input: ContactInput) => Promise<Contact>;
  /** Скласти особистий лінк контакту — окрема дія зі своїм наслідком. */
  makeLink: (id: number) => Promise<Contact>;
  /** Прибрати контакт: спершу на сервері, потім у списку. */
  remove: (id: number) => Promise<void>;
}

/** Рядок, який прийшов із сервера; без нього дія вважається не підтвердженою. */
function confirmed(contact: Contact | null, what: string): Contact {
  if (!contact) throw new Error(`Сервер не підтвердив ${what} — спробуйте ще раз.`);
  return contact;
}

export function useContacts(): ContactsState {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // `cancelled` — не формальність: екран закривають раніше, ніж прийде
    // відповідь, і без перевірки стан оновився б у вже знятому дереві.
    let cancelled = false;

    contactsApi
      .list()
      .then((list) => {
        if (cancelled) return;
        setContacts(list);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Не вдалося завантажити контакти");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const create = useCallback(async (input: ContactInput): Promise<Contact> => {
    const created = confirmed(await contactsApi.create(input), "створення");
    // Свіжий контакт — згори: його щойно завели, і шукати його очима внизу
    // списку було б роботою на порожньому місці.
    setContacts((prev) => [created, ...prev]);
    return created;
  }, []);

  // Замінюємо **на місці**: правка не робить контакт свіжішим, і стрибок
  // картки вгору списку читався б як «з'явився ще один».
  const replace = useCallback((updated: Contact): Contact => {
    setContacts((prev) => prev.map((contact) => (contact.id === updated.id ? updated : contact)));
    return updated;
  }, []);

  const update = useCallback(
    async (id: number, input: ContactInput): Promise<Contact> =>
      replace(confirmed(await contactsApi.update(id, input), "зміну")),
    [replace],
  );

  const makeLink = useCallback(
    async (id: number): Promise<Contact> =>
      replace(confirmed(await contactsApi.makeLink(id), "лінк")),
    [replace],
  );

  const remove = useCallback(async (id: number): Promise<void> => {
    // Спершу сервер: прибрати картку, а потім дізнатись, що видалення не
    // вдалося, означало б показати людину, якої в списку вже немає.
    await contactsApi.remove(id);
    setContacts((prev) => prev.filter((contact) => contact.id !== id));
  }, []);

  return { contacts, loading, error, create, update, makeLink, remove };
}
