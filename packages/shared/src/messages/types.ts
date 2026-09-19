/**
 * Типи повідомлень — одна форма на сервер і на оболонку.
 *
 * **Що це.** Листування **між людьми платформи**, без участі бота: повідомлення
 * живуть у нашій базі, а бот у них не бере участі взагалі. Це не «ще одна
 * нотатка»: у нотатки один власник, а тут їх двоє, і саме тому в кожної дії
 * спершу перевіряється **зв'язок** зі співрозмовником (див.
 * `api-dev/src/services/messages/links.ts`).
 *
 * **Кому можна писати.** Лише тому, з ким людина **зв'язана через контакти**:
 * один із них прийшов за особистим лінком іншого. Це той зв'язок, який уже
 * існує в продукті (`contacts.owner_id` → `contacts.joined_user_id`), тож
 * окремого «запиту в друзі» немає — і другого сховища тих самих стосунків теж.
 *
 * **Ідентичність — `id` людини з Telegram.** Він приходить із підписаного
 * `initData` (`api-dev/src/shared/identity.ts`), а не з клієнта; тому в жодній
 * формі запиту немає «від кого» — лише «кому».
 *
 * @module @wwwuabot/shared/messages
 */

/**
 * Співрозмовник так, як його показує платформа.
 *
 * Три імені тут стоять разом навмисно, бо це **різні речі**, і плутати їх не
 * можна (AGENTS.md §2):
 *
 * | Поле | Чиє воно | Може зникнути |
 * |---|---|---|
 * | `contactName` | **моє** — я так назвав людину | ні, поки я тримаю контакт |
 * | `platformUsername` | її — обрала сама на порталі | ні |
 * | `username` | Telegram — не ми обирали | так |
 *
 * Порядок показу задає `peerLabel` і саме в цьому порядку: наше ім'я першим,
 * бо воно є іменем людини в продукті **для того, хто дивиться**.
 */
export interface MessagePeer {
  /** Telegram-id людини — він же `user_id` у `users`. */
  id: number;
  firstName: string | null;
  lastName: string | null;
  /** Telegram-хендл **без** `@`; `null` — людина його не має. */
  username: string | null;
  /** Ім'я на платформі **без** `@`; `null` — ще не обрала. */
  platformUsername: string | null;
  /**
   * Ім'я, яким **той, хто читає**, назвав цю людину у своєму довіднику;
   * `null` — у довіднику її немає.
   *
   * Це не колонка `users`: ім'я належить тому, хто дивиться, тож те саме
   * обличчя в двох людей підписане по-різному. Читає його бік того, хто
   * запитує (`contacts.owner_id`), а не сам співрозмовник.
   */
  contactName: string | null;
  /** Аватар із даних Telegram; `null` — Telegram фото не віддав. */
  photoUrl: string | null;
}

/** Одне повідомлення розмови. */
export interface Message {
  id: number;
  /** Хто написав: Telegram-id, тож «моє» визначає той, хто читає. */
  senderId: number;
  body: string;
  createdAt: string;
  /** Коли прочитав **одержувач**; `null` — ще не прочитано. */
  readAt: string | null;
  /**
   * Позначка **платформи**, а не людини: вітання пари при першому відкритті
   * розмови. Непрочитаним таке повідомлення не буває ніколи, бо його ніхто не
   * писав і чекати на нього нема чого.
   */
  system: boolean;
}

/**
 * Рядок списку розмов.
 *
 * Останнє повідомлення лежить у самій розмові, а не вибирається з `messages`:
 * інакше список читав би всі повідомлення людини заради одного рядка на
 * розмову. `unread` рахує сервер — клієнт не має для цього даних.
 */
export interface Conversation {
  peer: MessagePeer;
  lastMessageAt: string | null;
  lastMessageText: string | null;
  /** Хто написав останній — щоб у списку було видно «ви: …». */
  lastSenderId: number | null;
  /** Скільки повідомлень співрозмовника я ще не прочитав. */
  unread: number;
}

/**
 * Ненадіслана чернетка — **одна на пару людей**.
 *
 * Це власні дані того, хто пише (як нотатка чи контакт), а не частина переписки:
 * співрозмовник про неї не знає, і в `messages` її немає. Тому й ключ тут —
 * `peerId`, а не розмова: чернетку заводять **до** першого повідомлення, коли
 * розмови ще не існує.
 *
 * `body` може бути порожнім — «обрав людину, але ще не написав» це теж стан
 * чернетки, і втрачати його нема чого.
 */
export interface MessageDraft {
  /** Кому адресована — Telegram-id людини. */
  peerId: number;
  body: string;
  updatedAt: string;
}

/** Розмова зі співрозмовником: самі повідомлення й те, хто він. */
export interface MessageThread {
  peer: MessagePeer | null;
  messages: Message[];
}

/** Відповідь списку розмов — найсвіжіші згори. */
export interface ConversationListResponse {
  ok?: boolean;
  conversations?: Conversation[];
  error?: string;
}

/** Відповідь розмови: повідомлення **від старіших до свіжіших**. */
export interface MessageThreadResponse {
  ok?: boolean;
  peer?: MessagePeer | null;
  messages?: Message[];
  error?: string;
}

/** Відповідь надсилання — той рядок, який справді ліг у базу. */
export interface MessageSendResponse {
  ok?: boolean;
  message?: Message;
  error?: string;
}

/** Відповідь позначення прочитаним: скільком повідомленням це сталося. */
export interface MessageReadResponse {
  ok?: boolean;
  read?: number;
  error?: string;
}

/**
 * Відповідь дій над перепискою (стерти / прибрати розмову).
 *
 * `removed` — скільком повідомленням це сталося; `0` — законний результат
 * (розмови ще не було), а не помилка: натиснути «очистити» в порожній розмові
 * можна, і це не привід показувати збій.
 */
export interface MessageClearResponse {
  ok?: boolean;
  removed?: number;
  error?: string;
}

/**
 * Відповідь форми нового повідомлення — **усе, що їй потрібно**.
 *
 * Два факти в одній відповіді, бо їх читає одна поверхня й одночасно: кому
 * можна писати (`recipients` — зв'язані через контакти) і що вже написано, але
 * не надіслано (`drafts`).
 */
export interface MessageComposeResponse {
  ok?: boolean;
  recipients?: MessagePeer[];
  drafts?: MessageDraft[];
  error?: string;
}

/** Відповідь збереження чернетки; `draft: null` — чернетку прибрано. */
export interface MessageDraftResponse {
  ok?: boolean;
  draft?: MessageDraft | null;
  error?: string;
}

/** Відповідь лічильника для бейджа у футері. */
export interface MessageBadgeResponse {
  ok?: boolean;
  unread?: number;
  error?: string;
}
