/**
 * Люди для вибору в прибиранні: список береться з журналу, а не з `users` —
 * у журналі вже тільки ті, хто щось робив, і показувати треба саме їх.
 *
 * Пошук із паузою (250 мс): поле вводу не мусить бити в базу на кожну літеру.
 *
 * @module web-admin-dev/src/pages/analytics/useLogUsers
 */

import { useEffect, useState } from "react";
import type { EventUserSummary } from "@wwwuabot/shared/events";
import { fetchEventUsers } from "../../shared/api/events.api";

const SEARCH_PAUSE_MS = 250;

export interface LogUsersState {
  users: EventUserSummary[];
  loading: boolean;
  error: string | null;
}

export function useLogUsers(search: string): LogUsersState {
  const [users, setUsers] = useState<EventUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void fetchEventUsers(search)
        .then((list) => {
          if (cancelled) return;
          setUsers(list);
          setError(null);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : "Не вдалось прочитати людей");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, SEARCH_PAUSE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  return { users, loading, error };
}
