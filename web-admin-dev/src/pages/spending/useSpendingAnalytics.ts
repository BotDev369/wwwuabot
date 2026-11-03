/**
 * Стан двох розрізів: коди платежів і отримувачі.
 *
 * Кожен розріз має власний запит: період кодів — місяць сторінки, вікно
 * отримувачів — окремий вибір, і змішувати їх в одному стані означало б
 * перезавантажувати одне при зміні іншого.
 * @module web-admin-dev/src/pages/spending/useSpendingAnalytics
 */

import { useCallback, useEffect, useState } from "react";
import type { SpendingCodes, SpendingRecipients, SpendingScope } from "@wwwuabot/shared/spending";
import { fetchSpendingCodes, fetchSpendingRecipients } from "../../shared/api/spending.api";

export interface CodesState {
  view: SpendingCodes | null;
  loading: boolean;
  error: string | null;
}

export function useSpendingCodes(period: string | null): CodesState {
  const [view, setView] = useState<SpendingCodes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setView(await fetchSpendingCodes(period));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалось прочитати розріз за кодами");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- асинхронне завантаження: setState усередині load()
    void load();
  }, [load]);

  return { view, loading, error };
}

export interface RecipientsState {
  view: SpendingRecipients | null;
  loading: boolean;
  error: string | null;
  selectScope: (scope: SpendingScope) => void;
}

export function useSpendingRecipients(initial: SpendingScope): RecipientsState {
  const [scope, setScope] = useState<SpendingScope>(initial);
  const [view, setView] = useState<SpendingRecipients | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setView(await fetchSpendingRecipients(scope));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалось прочитати розріз за отримувачами");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- асинхронне завантаження: setState усередині load()
    void load();
  }, [load]);

  const selectScope = useCallback((next: SpendingScope) => setScope(next), []);

  return { view, loading, error, selectScope };
}
