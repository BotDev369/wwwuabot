/**
 * Типи особистих лінків-запрошень — одна форма на сервер і на обидві оболонки.
 *
 * **Рядок `invites` і лінк — одне й те саме.** Лінк персональний: його
 * створюють під конкретну людину, і він фіксує факт, що саме ця людина
 * приєдналася. Тому в лінка не «список учасників», а один контакт — і в
 * розмітці це видно без здогадок.
 *
 * @module @wwwuabot/shared/invites
 */

/** Контакт, який приєднався за лінком. */
export interface InviteContact {
  /** Telegram-id приєднаного — той, кого закріплено за власником лінка. */
  userId: number;
  /** Ім'я одним рядком (`contactDisplayName`). */
  name: string;
  /** `@handle` у Telegram або `null`. */
  username: string | null;
  /** Коли приєднався (SQLite-час, як в інших таблицях). */
  joinedAt: string;
  /**
   * Скільки людей запросив **сам цей контакт** — другий рівень схеми
   * залучених. Рахує сервер одним запитом, а не клієнт по всьому списку.
   */
  invitedCount: number;
}

/** Особистий лінк: код, підпис і те, кого він закріпив. */
export interface InviteLink {
  id: number;
  /** Код — він же payload у `?start=`. */
  code: string;
  /** Як людина назвала лінк (ім'я контакту). */
  label: string;
  /** Готовий діплінк у бота; `null` — імені бота немає, лінк зібрати нічим. */
  deepLink: string | null;
  /** Контакт або `null`, якщо за лінком ще ніхто не прийшов. */
  contact: InviteContact | null;
  createdAt: string;
}

/** Відповідь списку: лінки людини, найсвіжіші згори. */
export interface InviteListResponse {
  ok?: boolean;
  links?: InviteLink[];
  error?: string;
}

/** Відповідь створення: той рядок, який справді ліг у базу. */
export interface InviteSaveResponse {
  ok?: boolean;
  link?: InviteLink;
  error?: string;
}

/** Відповідь видалення — щоб клієнт не вважав зникнення лінка випадковим. */
export interface InviteDeleteResponse {
  ok?: boolean;
  error?: string;
}
