/**
 * Сторінки, які створює людина, — рядки таблиці `scenarios`.
 *
 * **Чому саме `scenarios`.** Там уже живе сторінка вебу (`page_data`) разом із
 * її поданням у боті, і адреса там одна — `slug`. Друга таблиця під той самий
 * контент дала б два сховища одного `PageConfig` і друге правило «яка сторінка
 * для цього URL» (`AGENTS.md` §7). Тому сторінка людини — це **той самий
 * рядок**, лише з власником (`owner_id`), прапорцем видимості (`is_public`) і
 * ключем шаблону (`template_key`).
 *
 * **Значень тут немає.** Текст живе в `page_data` — у блоках, які будує
 * `buildPageConfig()`. Поля, які людина заповнює, їдуть у клієнт **виведеними**
 * з тієї ж конфігурації (`readPageValues`): тримати їх поруч із `page_data`
 * означало б мати два місця правди про один текст.
 *
 * @module @wwwuabot/shared/pages
 */

import type { PageFieldValues, PageTemplateKey } from "./templates";

/** Сторінка людини, як вона їде в клієнт. */
export interface UserPage {
  id: number;
  /** Адреса сторінки: за нею її відкривають (`/slug`). */
  slug: string;
  /** Назва — вона ж підпис у списку, заголовок сторінки й назва в боті. */
  title: string;
  template: PageTemplateKey;
  /** Тексти полів, виведені з `page_data` (див. `readPageValues`). */
  values: PageFieldValues;
  /** `true` — сторінку видно в Просторі; `false` — тільки авторові. */
  isPublic: boolean;
  updatedAt: string;
}

/** Те, що надсилає форма: без `id` — нова, з `id` — правка своєї. */
export interface PageDraft {
  id?: number;
  template: PageTemplateKey;
  values: PageFieldValues;
  /**
   * Адреса. Порожня — сервер складе її з назви (див. `pageAddress`).
   *
   * Саме адреса, а не `slug`: у формі видно те, що людина надрукувала, і
   * назвати це `slug` означало б обіцяти, що порожнє поле так і лишиться
   * порожнім (а воно ні — воно стане адресою).
   */
  address: string;
  isPublic: boolean;
}

/** Відповідь `GET /api/user/pages`: власні сторінки, разом із неоприлюдненими. */
export interface PageListResponse {
  ok: boolean;
  pages: UserPage[];
}

/** Відповідь `POST /api/user/pages`: збережена сторінка. */
export interface PageSaveResponse {
  ok: boolean;
  page: UserPage | null;
  error?: string;
}

/** Відповідь `DELETE /api/user/pages`. */
export interface PageDeleteResponse {
  ok: boolean;
  id?: number;
  error?: string;
}

/**
 * Сторінка в Просторі — **чуже подання**.
 *
 * Полів-значень тут немає навмисно: чужу сторінку читають, а не правлять, а
 * кожне зайве поле в публічній відповіді — це ще один спосіб показати те, що
 * автор лишив собі (`AGENTS.md` §7).
 */
export interface PublicPage {
  id: number;
  slug: string;
  title: string;
  template: PageTemplateKey;
  /** Автор: ім'я на платформі (`#ім'я`) і фото — без даних Telegram. */
  author: { id: number; name: string | null; photoUrl: string | null };
  updatedAt: string;
}

/** Відповідь `GET /api/space/pages`: опубліковане, без авторизації. */
export interface PublicPageListResponse {
  ok: boolean;
  pages: PublicPage[];
}
