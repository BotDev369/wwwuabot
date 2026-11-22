/**
 * Стан переписки людини з ботом: перша порція, «ще 6» і помилки. Старші
 * дописуються згори, тож стрічка читається зверху вниз і не стрибає.
 *
 * @module web-admin-dev/src/pages/users/useUserChat
 */

import { useCallback, useEffect, useState } from "react";
import { listUserMessages, type BotMessageRow } from "../../shared/api/users.api";

export function useUserChat(userId: number) {
  const [messages, setMessages] = useState<BotMessageRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetching: setState in listUserMessages().then/.catch
    setLoading(true);
    setError(null);
    listUserMessages(userId)
      .then((page) => {
        if (cancelled) return;
        setMessages(page.messages);
        setHasMore(page.hasMore);
        setNextBefore(page.nextBefore);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const loadMore = useCallback(async () => {
    if (nextBefore === null || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await listUserMessages(userId, nextBefore);
      setMessages((previous) => [...page.messages, ...previous]);
      setHasMore(page.hasMore);
      setNextBefore(page.nextBefore);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingMore(false);
    }
  }, [userId, nextBefore, loadingMore]);

  return { messages, hasMore, loading, loadingMore, error, loadMore };
}
