/**
 * Клієнт повідомлень — та сама пара «форма запиту ↔ транспорт», що в нотатках
 * і контактах.
 *
 * **«Від кого» не передається ніколи:** автора бере сервер із підписаного
 * `initData`, тож у запитах є лише `peer` — **кому**. Надсилання повертає той
 * рядок, який ліг у базу: бульбашка малюється з відповіді, а не з припущення про
 * її номер і час. Чернетка адресується **своїм номером** (`id`), а надсилання
 * каже, з якої чернетки людина пише: чернеток може бути кілька, і прибирати чужі
 * було б втратою написаного. Розгорнуто — `docs/SURFACES.md`.
 *
 * @module @wwwuabot/shared/messages
 */

import type {
  Conversation,
  ConversationListResponse,
  Message,
  MessageBadgeResponse,
  MessageClearResponse,
  MessageComposeResponse,
  MessageDraft,
  MessageDraftInput,
  MessageDraftResponse,
  MessageMedia,
  MessageMediaResponse,
  MessagePeer,
  MessageReadResponse,
  MessageSendResponse,
  MessageThread,
  MessageThreadResponse,
} from "./types";

/** Мінімум, який потрібен від транспорту оболонки. */
export interface MessagesTransport {
  <T>(path: string, init?: RequestInit): Promise<T>;
}

/**
 * Транспорт завантаження — окремий від `MessagesTransport` навіть тоді, коли це
 * той самий `fetch`.
 *
 * Причина та сама, що в магазині: спільний клієнт ставить `Content-Type:
 * application/json`, а для multipart це зіпсувало б межу частин.
 */
export interface MessagesUploadTransport {
  <T>(path: string, form: FormData): Promise<T>;
}

export interface MessagesApi {
  /** Розмови людини, найсвіжіші згори. */
  list: () => Promise<Conversation[]>;
  /** Повідомлення розмови; `before` — підвантажити старіші за цей номер. */
  thread: (peerId: number, before?: number) => Promise<MessageThread>;
  /**
   * Надіслати повідомлення співрозмовнику.
   *
   * `draftId` — чернетка, з якої надіслали: зникає **саме та**, решта — те, що
   * людина ще пише. `mediaId` — номер фото (див. `attach`): порожній текст із
   * фото — законне повідомлення.
   */
  send: (
    peerId: number,
    body: string,
    draftId?: number | null,
    mediaId?: number | null,
  ) => Promise<Message | null>;
  /**
   * Завантажити фото в розмову — **до** надсилання.
   *
   * Повертає номер рядка обліку: саме він їде в `send`. Повідомлення тут не
   * створюється, бо фото можна приєднати лише однією стрічкою — до того, як
   * людина напише текст.
   */
  attach: (peerId: number, file: File) => Promise<{ id: number } & MessageMedia>;
  /** Позначити прочитаним усе, що написав співрозмовник; повертає число. */
  markRead: (peerId: number) => Promise<number>;
  /** Скільки повідомлень чекає на прочитання — для бейджа футера. */
  badge: () => Promise<number>;
  /**
   * Усе, що потрібно формі нового повідомлення: **кому можна писати** (зв'язані
   * через контакти — включно з тими, чию розмову прибрано зі списку) і чернетки.
   */
  compose: () => Promise<{ recipients: MessagePeer[]; drafts: MessageDraft[] }>;
  /**
   * Зберегти чернетку — нову (`id: null`) або правку наявної.
   *
   * Порожнє тіло прибирає чернетку (без тексту вона нічого не несе), а адресат
   * не потрібен: лист без «кому» — законний стан. Повертає збережене або `null`.
   */
  saveDraft: (input: MessageDraftInput) => Promise<MessageDraft | null>;
  /**
   * Стерти переписку — **у обох** (розмова одна на пару).
   *
   * Порожня розмова лишається на місці: людина може писати далі, і в списку
   * вона нікуди не зникає. Невдача кидає виняток — інакше зникала б історія,
   * якої насправді ніхто не стирав (та сама причина, чому `markRead` кидає).
   */
  clear: (peerId: number) => Promise<void>;
  /**
   * Прибрати розмову зі списку — **у обох**: переписка спільна, і поділити її на
   * «моє» й «чуже» нема де. Рядок розмови лишається (інакше писати було б нікуди),
   * тож розмова повертається сама — з першим новим повідомленням.
   */
  remove: (peerId: number) => Promise<void>;
}

/** Складає клієнт повідомлень для конкретного шляху. */
export function createMessagesApi(
  fetchJson: MessagesTransport,
  basePath: string,
  upload?: MessagesUploadTransport,
): MessagesApi {
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

    send: async (peerId, body, draftId, mediaId) => {
      const response = await fetchJson<MessageSendResponse>(`${basePath}/send`, {
        method: "POST",
        body: JSON.stringify({
          peer: peerId,
          body,
          draft: draftId ?? undefined,
          media: mediaId ?? undefined,
        }),
      });
      return response.message ?? null;
    },

    attach: async (peerId, file) => {
      if (!upload) throw new Error("Оболонка не вміє завантажувати файли");

      const form = new FormData();
      form.append("peer", String(peerId));
      form.append("file", file);

      const response = await upload<MessageMediaResponse>(`${basePath}/media`, form);
      if (!response.media) throw new Error(response.error ?? "Не вдалося завантажити фото");

      return response.media;
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

    compose: async () => {
      const response = await fetchJson<MessageComposeResponse>(`${basePath}/compose`);
      return { recipients: response.recipients ?? [], drafts: response.drafts ?? [] };
    },

    saveDraft: async (input) => {
      const response = await fetchJson<MessageDraftResponse>(`${basePath}/draft`, {
        method: "POST",
        body: JSON.stringify({
          id: input.id ?? undefined,
          peer: input.peerId ?? undefined,
          body: input.body,
        }),
      });
      if (!response.ok) throw new Error(response.error ?? "Не вдалося зберегти чернетку");
      return response.draft ?? null;
    },
  };
}
