/**
 * Списки розпорядника: договори, сплати й надходження з курсором.
 *
 * Пагінація — `nextCursor` із відповіді, а не номер сторінки: база сортує за
 * датою й `id`, тож «сторінка 2» без ключа останнього рядка нічого не значить.
 * `more()` дописує в кінець: список читають як історію, а не як таблицю.
 * @module web-admin-dev/src/pages/spending/useSpendingList
 */

import { useCallback, useEffect, useState } from "react";
import type {
  SpendingDocument,
  SpendingPage,
  SpendingRole,
  SpendingTransaction,
} from "@wwwuabot/shared/spending";
import { fetchSpendingDocuments, fetchSpendingTransactions } from "../../shared/api/spending.api";

/** Стеля відповіді — 50 рядків; більше не просять і з панелі. */
const PAGE_SIZE = 50;

export interface SpendingListState<T> {
  items: T[];
  nextCursor: string | null;
  loading: boolean;
  error: string | null;
  more: () => Promise<void>;
}

function usePagedList<T>(
  load: (cursor: string | null) => Promise<SpendingPage<T>>,
): SpendingListState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      setLoading(true);
      try {
        const page = await load(cursor);
        setItems((previous) => [...(append ? previous : []), ...page.items]);
        setNextCursor(page.nextCursor);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не вдалось прочитати список");
      } finally {
        setLoading(false);
      }
    },
    [load],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- асинхронне завантаження: setState усередині fetchPage()
    void fetchPage(null, false);
  }, [fetchPage]);

  const more = useCallback(async () => {
    if (!nextCursor || loading) return;
    await fetchPage(nextCursor, true);
  }, [nextCursor, loading, fetchPage]);

  return { items, nextCursor, loading, error, more };
}

export function useSpendingDocuments(
  edrpou: string,
  period: string,
): SpendingListState<SpendingDocument> {
  const load = useCallback(
    (cursor: string | null) => fetchSpendingDocuments({ edrpou, period, cursor, limit: PAGE_SIZE }),
    [edrpou, period],
  );
  return usePagedList(load);
}

export function useSpendingTransactions(
  edrpou: string,
  period: string,
  role: SpendingRole,
): SpendingListState<SpendingTransaction> {
  const load = useCallback(
    (cursor: string | null) =>
      fetchSpendingTransactions({ edrpou, role, period, cursor, limit: PAGE_SIZE }),
    [edrpou, role, period],
  );
  return usePagedList(load);
}
