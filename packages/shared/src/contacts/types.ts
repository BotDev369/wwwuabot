/**
 * Типи контакту — одна форма на сервер і на обидві оболонки.
 *
 * **Контакт — це запис, а не лінк.** Раніше рядок був «лінком запрошення», і
 * все, що про людину знали, — підпис і факт приєднання. Тепер запис заводять
 * руками (ім'я, `@username`, Telegram-id, хештеги, примітки), а лінк — одне з
 * його полів: контакт може існувати **без** лінка, і це нормальний стан, а не
 * «незавершене створення».
 *
 * Тому полів два роди, і плутати їх не можна:
 *
 * - **власні** (`name`, `username`, `telegramUserId`, `tags`, `notes`) — їх
 *   пише людина в картці, і вони є завжди, навіть коли лінка немає;
 * - **наслідкові** (`telegramUserId` після приєднання, `joinedAt`, `code`,
 *   `invitedCount`) — їх записує система: бот закріплює того, хто прийшов за
 *   лінком, а сервер рахує глибину гілки.
 *
 * @module @wwwuabot/shared/contacts
 */

/** Контакт так, як його віддає сервер. */
export interface Contact {
  id: number;
  /** Ім'я, яким власник називає цей контакт. */
  name: string;
  /** `@handle` без `@`; `null` — хендл невідомий. */
  username: string | null;
  /** Telegram-id людини; після приєднання за лінком його ставить бот. */
  telegramUserId: number | null;
  /** Хештеги — ті самі правила, що в нотатках (`@wwwuabot/shared/tags`). */
  tags: string[];
  /** Примітки власника. */
  notes: string;
  /** Код особистого лінка (`inv-8f3k2q`) — поле контакту; `null` — лінка немає. */
  code: string | null;
  /** Готовий діплінк; `null` — лінка немає або імені бота не дізнались. */
  deepLink: string | null;
  /** Коли людина прийшла за лінком; `null` — ще ні. */
  joinedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /**
   * Скільком людям **цей** контакт (як власник) закріпив контакт — другий
   * рівень схеми залучених. Рахує сервер одним запитом на весь список.
   */
  invitedCount: number;
}

/**
 * Те, що власник заповнює в картці: і створення, і правка — **та сама форма**.
 *
 * Одна форма на дві дії навмисно: картка редагує всі поля одразу, і другий
 * опис «що можна створити» проти «що можна змінити» розійшовся б із першим на
 * першій же правці.
 */
export interface ContactInput {
  name: string;
  username: string | null;
  telegramUserId: number | null;
  tags: string[];
  notes: string;
}

/** Відповідь списку: контакти власника, найсвіжіші згори. */
export interface ContactListResponse {
  ok?: boolean;
  contacts?: Contact[];
  error?: string;
}

/** Відповідь створення, правки й лінка: той рядок, який справді ліг у базу. */
export interface ContactSaveResponse {
  ok?: boolean;
  contact?: Contact;
  error?: string;
}

/** Відповідь видалення — щоб клієнт не вважав зникнення контакту випадковим. */
export interface ContactDeleteResponse {
  ok?: boolean;
  error?: string;
}
