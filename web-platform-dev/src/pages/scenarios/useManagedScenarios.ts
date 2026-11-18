/**
 * Сценарії, які веде людина, — дані для магазину й екрана «Замовлення».
 *
 * Джерело — `GET /api/user/pages`: ідентичність там беруть із підписаного
 * `initData`, тож клієнт не передає жодного `user_id` і не може попросити чужі
 * рядки. Приватні серед них є — і мусять бути: це власний список людини, а не
 * стрічка.
 *
 * **Це читання, і тільки воно.** Сторінку не створюють і не правлять із
 * інтерфейсу — її заводить платформа кодом і міграціями, тож список не має ні
 * `upsert`, ні `remove`: дія, якої немає на сервері, не має бути й на клієнті.
 *
 * @module web-platform-dev/src/pages/scenarios
 */

import { useEffect, useState } from "react";
import type { ManagedScenario } from "@wwwuabot/shared/pages";
import { scenariosApi } from "@/shared/api/scenarios.api";

export interface ManagedScenariosState {
  pages: ManagedScenario[];
  loading: boolean;
  error: string | null;
}

export function useManagedScenarios(): ManagedScenariosState {
  const [pages, setPages] = useState<ManagedScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // `cancelled` — не формальність: екран закривають раніше, ніж прийде
    // відповідь, і без цієї перевірки стан оновлювався б у вже знятому дереві.
    let cancelled = false;

    scenariosApi
      .listOwn()
      .then((list) => {
        if (cancelled) return;
        setPages(list);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Не вдалося завантажити магазини");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { pages, loading, error };
}
