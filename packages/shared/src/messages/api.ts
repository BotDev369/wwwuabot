/**
 * Клієнт повідомлень — та сама пара «форма запиту ↔ транспорт», що в нотатках
 * і контактах: оболонка дає лише шлях, форма запиту живе тут.
 *
 * **«Від кого» не передається ніколи.** Автора бере сервер із підписаного
 * `initData`, тож попросити чужу переписку нічим: у запитах немає жодного
 * `user_id`, лише `peer` — **кому**.
 *
 * Надсилання повертає **той рядок, який ліг у базу**: бульбашка малюється з
 * відповіді, а не з припущення про те, яким буде її номер і час.
 *
 * @module @wwwuabot/shared/messages
 */

import type {
  Conversation,
  ConversationListResponse,
  Message,
  MessageBadgeResponse,
  MessageReadResponse,
  MessageSendResponse,
  MessageThread,
  MessageThreadResponse,
} from "./types";

/** Мінімум, який потрібен від транспорту оболонки. */
export interface MessagesTransport {
  <T>(path: string, init?: RequestInit): Promise<T>;
}

export interface MessagesApi {
  /** Розмови людини, найсвіжіші згори. */
  list: () => Promise<Conversation[]>;
  /** Повідомлення розмови; `before` — підвантажити старіші за цей номер. */
  thread: (peerId: number, before?: number) => Promise<MessageThread>;
  /** Надіслати повідомлення співрозмовнику. */
  send: (peerId: number, body: string) => Promise<Message | null>;
  /** Позначити прочитаним усе, що написав співрозмовник; повертає число. */
  markRead: (peerId: number) => Promise<number>;
  /** Скільки повідомлень чекає на прочитання — для бейджа футера. */
  badge: () => Promise<number>;
}

/** Складає клієнт повідомлень для конкретного шляху. */
export function createMessagesApi(fetchJson: MessagesTransport, basePath: string): MessagesApi {
  return {
    list: async () => (await fetchJson<ConversationListResponse>(basePath)).conversations ?? [],

    thread: async (peerId, before) => {
      // Старіші підвантажуємо тим самим шляхом, лише з межею: друга ручка
      // «попередні повідомлення» була б другим правилом того самого порядку.
      const query = new URLSearchParams({ peer: String(peerId) });
      if (before !== undefined) query.set("before", String(before));

      const response = await fetchJson<MessageThreadResponse>(`${basePath}/thread?${query}`);
      return { peer: response.peer ?? null, messages: response.messages ?? [] };
    },

    send: async (peerId, body) => {
      const response = await fetchJson<MessageSendResponse>(`${basePath}/send`, {
        method: "POST",
        body: JSON.stringify({ peer: peerId, body }),
      });
      return response.message ?? null;
    },

    markRead: async (peerId) => {
      const response = await fetchJson<MessageReadResponse>(`${basePath}/read`, {
        method: "POST",
        body: JSON.stringify({ peer: peerId }),
      });
      if (!response.ok) throw new Error(response.error ?? "Не вдалося позначити прочитаним");
      return response.read ?? 0;
    },

    badge: async () => (await fetchJson<MessageBadgeResponse>(`${basePath}/badge`)).unread ?? 0,
  };
}
