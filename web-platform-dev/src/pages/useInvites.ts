/**
 * Контакти людини — дані для екрана «МоїКонтакти».
 *
 * Джерело — `GET /api/invites`: ідентичність там беруть із підписаного
 * `initData`, тож клієнт не передає жодного `user_id` і не може попросити чужі
 * контакти.
 *
 * **Оновлюємо локально, а не повторним запитом.** Сервер уже віддає створений
 * і змінений рядок і підтверджує зникнення — другий похід по весь список
 * показав би те саме з затримкою (список «блимнув» би завантаженням після
 * кожного дотику).
 *
 * @module web-platform-dev/src/pages/useInvites
 */

import { useCallback, useEffect, useState } from "react";
import type { InviteLink } from "@wwwuabot/shared/invites";
import { invitesApi } from "@/shared/api/invites.api";

export interface InvitesState {
  links: InviteLink[];
  loading: boolean;
  error: string | null;
  /** Створити контакт із підписом: повертає той рядок, який справді ліг у базу. */
  create: (label: string) => Promise<InviteLink>;
  /** Перейменувати контакт: повертає рядок так, як його тепер віддає сервер. */
  rename: (id: number, label: string) => Promise<InviteLink>;
  /** Прибрати контакт зі списку після видалення. */
  remove: (id: number) => void;
}

export function useInvites(): InvitesState {
  const [links, setLinks] = useState<InviteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // `cancelled` — не формальність: екран закривають раніше, ніж прийде
    // відповідь, і без перевірки стан оновився б у вже знятому дереві.
    let cancelled = false;

    invitesApi
      .list()
      .then((list) => {
        if (cancelled) return;
        setLinks(list);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Не вдалося завантажити лінки");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const create = useCallback(async (label: string): Promise<InviteLink> => {
    const created = await invitesApi.create(label);
    if (!created) throw new Error("Сервер не підтвердив створення — спробуйте ще раз.");
    // Свіжий лінк — згори: його щойно склали, і шукати його очима внизу
    // списку було б роботою на порожньому місці.
    setLinks((prev) => [created, ...prev]);
    return created;
  }, []);

  const remove = useCallback((id: number) => {
    setLinks((prev) => prev.filter((link) => link.id !== id));
  }, []);

  const rename = useCallback(async (id: number, label: string): Promise<InviteLink> => {
    const updated = await invitesApi.rename(id, label);
    if (!updated) throw new Error("Сервер не підтвердив зміну — спробуйте ще раз.");
    // Замінюємо **на місці**: правка не робить контакт свіжішим, і стрибок
    // картки вгору списку читався б як «створився ще один».
    setLinks((prev) => prev.map((link) => (link.id === id ? updated : link)));
    return updated;
  }, []);

  return { links, loading, error, create, rename, remove };
}
