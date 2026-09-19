/**
 * Одна розмова — стрічка, співрозмовник і надсилання.
 *
 * **Прочитаним позначаємо на боці сервера, а не в стані.** Бейдж у футері
 * рахує сервер; якби «прочитано» осідало лише в клієнті, наступне опитування
 * повернуло б те саме число, і бейдж виглядав би зламаним.
 *
 * **Надіслане додаємо з відповіді сервера.** Показати текст одразу, а потім
 * дізнатись, що він не ліг у базу, означало б бульбашку, якої немає в
 * переписці: клієнт не має права малювати те, чого сервер не підтвердив.
 *
 * **Дані зберігаються разом із тим, для кого вони.** Без цього при відкритті
 * іншої розмови було б видно **попередню** — рівно один кадр, поки не прийде
 * відповідь, — і це читалось би як підміна переписки. Тому стан знає свого
 * співрозмовника, а «завантажується» — це похідна величина: даних для **цього**
 * ще немає.
 *
 * @module web-platform-dev/src/pages/useThread
 */

import { useCallback, useEffect, useState } from "react";
import type { Message, MessagePeer } from "@wwwuabot/shared/messages";
import { messagesApi } from "@/shared/api/messages.api";

/** «Ще нікого»: справжній id людини завжди додатний. */
const NOBODY = 0;

interface ThreadData {
  /** Для кого ці дані; `NOBODY` — порожньо. */
  forPeer: number;
  peer: MessagePeer | null;
  messages: Message[];
}

const EMPTY: ThreadData = { forPeer: NOBODY, peer: null, messages: [] };

export interface ThreadState {
  peer: MessagePeer | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
  sending: boolean;
  /** Надіслати; повертає `true`, якщо сервер підтвердив. */
  send: (body: string) => Promise<boolean>;
  /** Стерти переписку (у обох); `true` — сервер підтвердив. */
  clear: () => Promise<boolean>;
  /** Прибрати саму розмову (у обох); `true` — сервер підтвердив. */
  remove: () => Promise<boolean>;
}

export function useThread(peerId: number | null): ThreadState {
  const [data, setData] = useState<ThreadData>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (peerId === null) return;
    let cancelled = false;

    void (async () => {
      try {
        const thread = await messagesApi.thread(peerId);
        if (cancelled) return;
        setData({ forPeer: peerId, peer: thread.peer, messages: thread.messages });
        setError(null);
        // Позначаємо прочитаним **після** успішного читання: якби це сталось
        // першим, невдале завантаження зняло б бейдж із непрочитаного.
        await messagesApi.markRead(peerId);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Не вдалося відкрити розмову");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [peerId]);

  const send = useCallback(
    async (body: string): Promise<boolean> => {
      if (peerId === null) return false;
      setSending(true);

      try {
        const message = await messagesApi.send(peerId, body);
        if (!message) throw new Error("Сервер не підтвердив надсилання — спробуйте ще раз.");
        setData((prev) => ({ ...prev, messages: [...prev.messages, message] }));
        return true;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Не вдалося надіслати повідомлення");
        return false;
      } finally {
        setSending(false);
      }
    },
    [peerId],
  );

  /**
   * Стерти переписку — у обох.
   *
   * Стрічку чистимо **після** відповіді сервера, а не до неї: показати порожній
   * екран без підтвердження означало б намалювати стан, якого в базі може не
   * бути (та сама причина, чому надіслане додається з відповіді).
   */
  const clear = useCallback(async (): Promise<boolean> => {
    if (peerId === null) return false;

    try {
      await messagesApi.clear(peerId);
      setData((prev) => ({ ...prev, messages: [] }));
      setError(null);
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Не вдалося стерти переписку");
      return false;
    }
  }, [peerId]);

  /**
   * Прибрати розмову цілком — у обох.
   *
   * Стан навмисно **не** підчищаємо: після цієї дії поверхня закривається (це
   * робить екран), а наступне відкриття однаково перечитує розмову — готувати
   * тут порожню розмову означало б гадати, що буде далі.
   */
  const remove = useCallback(async (): Promise<boolean> => {
    if (peerId === null) return false;

    try {
      await messagesApi.remove(peerId);
      setError(null);
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Не вдалося видалити розмову");
      return false;
    }
  }, [peerId]);

  const known = data.forPeer === peerId;

  return {
    peer: known ? data.peer : null,
    messages: known ? data.messages : [],
    // Даних для цього співрозмовника ще немає — і це не «порожня розмова».
    loading: peerId !== null && !known && error === null,
    error,
    sending,
    send,
    clear,
    remove,
  };
}
