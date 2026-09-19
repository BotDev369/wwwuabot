/**
 * Розмови людини — дані для екрана «Повідомлення».
 *
 * Джерело — `GET /api/messages`: ідентичність там беруть із підписаного
 * `initData`, тож клієнт не передає жодного `user_id` і не може попросити чужу
 * переписку.
 *
 * `reload` тут потрібен навмисно, на відміну від нотаток і контактів: розмови
 * **змінює співрозмовник**, і після повернення з розмови список мусить
 * показати те, що сталось у ній (зниклий бейдж, свіжий останок) — локально
 * оновити те, чого клієнт не робив, нічим.
 *
 * @module web-platform-dev/src/pages/useConversations
 */

import { useCallback, useEffect, useState } from "react";
import type { Conversation } from "@wwwuabot/shared/messages";
import { messagesApi } from "@/shared/api/messages.api";

export interface ConversationsState {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  /** Перечитати список — після розмови стан змінює співрозмовник, не ми. */
  reload: () => Promise<void>;
}

export function useConversations(): ConversationsState {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    try {
      setConversations(await messagesApi.list());
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Не вдалося завантажити розмови");
    }
  }, []);

  useEffect(() => {
    // `cancelled` — не формальність: екран закривають раніше, ніж прийде
    // відповідь, і без перевірки стан оновився б у вже знятому дереві.
    let cancelled = false;

    void (async () => {
      await load();
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [load]);

  return { conversations, loading, error, reload: load };
}
