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
  MessageClearResponse,
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
  /**
   * Стерти переписку — **у обох** (розмова одна на пару).
   *
   * Порожня розмова лишається на місці: людина може писати далі, і в списку
   * вона нікуди не зникає. Невдача кидає виняток — інакше зникала б історія,
   * якої насправді ніхто не стирав (та сама причина, чому `markRead` кидає).
   */
  clear: (peerId: number) => Promise<void>;
  /**
   * Прибрати розмову зі списку — **у обох**.
   *
   * Це не «глибша очистка», а інша дія: чистка лишає порожню розмову на місці,
   * а ця зникає зі списку в обох, як і стерта історія: переписка спільна, і
   * поділити її на «моє» й «чуже» нема де. Рядок розмови лишається (інакше в
   * пари не було б куди написати), тож повертається вона сама — з першим новим
   * повідомленням.
   */
  remove: (peerId: number) => Promise<void>;
}

/** Складає клієнт повідомлень для конкретного шляху. */
export function createMessagesApi(fetchJson: MessagesTransport, basePath: string): MessagesApi {
  /**
   * Дія над перепискою: тіло таке саме, як у надсиланні, — «з ким».
   *
   * Своєї відповіді на кожну дію немає навмисно: успіх — це `ok`, а стан
   * переписки клієнт і так перечитає (`thread`), бо стерта історія — це вже
   * інший її вміст. Друга форма відповіді тут лише розійшлася б із першою.
   */
  async function drop(path: string, peerId: number): Promise<void> {
    const response = await fetchJson<MessageClearResponse>(path, {
      method: "POST",
      body: JSON.stringify({ peer: peerId }),
    });
    if (!response.ok) throw new Error(response.error ?? "Не вдалося змінити переписку");
  }

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

    clear: (peerId) => drop(`${basePath}/clear`, peerId),

    remove: (peerId) => drop(`${basePath}/delete`, peerId),
  };
}
