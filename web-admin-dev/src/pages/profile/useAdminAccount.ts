/**
 * Стан сесії панелі для екрана профілю.
 *
 * Джерело — `GET /auth/check` (той самий ендпоїнт, що й у гейті входу), лише з
 * терміном дії. Стан живе тут, а не в компоненті: розділ лишається рендерингом.
 *
 * @module web-admin-dev/src/pages/profile/useAdminAccount
 */

import { useEffect, useState } from "react";
import { fetchAdminSession, type AdminSession } from "../../shared/api/auth.api";

export interface AdminAccountState {
  session: AdminSession | null;
  loading: boolean;
  error: string | null;
}

export function useAdminAccount(): AdminAccountState {
  const [state, setState] = useState<AdminAccountState>({
    session: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    fetchAdminSession()
      .then((session) => {
        if (!cancelled) setState({ session, loading: false, error: null });
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setState({
            session: null,
            loading: false,
            error: e instanceof Error ? e.message : "Не вдалося перевірити сесію",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
