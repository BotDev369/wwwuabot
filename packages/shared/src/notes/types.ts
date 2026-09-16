/**
 * Нотатка — один рядок таблиці `notes`.
 *
 * **Чому це окрема таблиця, а не `scenarios`.** У `scenarios` `slug` —
 * `NOT NULL UNIQUE`, тобто рядка без адреси там не існує, і це *опублікований*
 * контент (його видимість задає `is_active`). Нотатка — чернетка **конкретної
 * людини**, якої ніхто, крім неї, не бачить. Змішавши їх, ми отримали б у
 * одній таблиці другий фільтр видимості («моє» проти «опублікованого») — та
 * сама пастка, через яку колись з'явились дві копії сценаріїв (AGENTS.md §7).
 *
 * @module @wwwuabot/shared/notes
 */

/**
 * Чий це простір нотаток — і це єдина різниця між оболонками.
 *
 * - `user` — нотатки людини в платформі; власник — Telegram-id із **підписаного
 *   `initData`** (ніколи з заголовка чи cookie);
 * - `admin` — нотатки про проєкт із панелі; власник — акаунт сесії.
 */
export type NoteScope = "user" | "admin";

/**
 * Власник нотаток адмінки.
 *
 * Вхід у панель — один пароль (`ADMIN_SECRET`), особи в cookie-сесії поки
 * немає, тож нотатки проєкту належать спільному акаунту. Коли з'являться
 * особисті входи, тут стане id людини — і це єдине місце, яке треба буде
 * змінити: схема вже зберігає власника окремо від простору.
 */
export const SHARED_ADMIN_OWNER = "shared";

/** Нотатка, як вона лежить у базі й їде в клієнт. */
export interface NoteRow {
  id: number;
  scope: NoteScope;
  /** Telegram-id (для `user`) або акаунт сесії (для `admin`), завжди рядком. */
  owner_id: string;
  text: string;
  /** Хештеги — те, за чим нотатку потім знайдуть. */
  tags: string[];
  created_at: string;
  updated_at: string;
}

/** Те, що надсилає композер: без `id` — нова нотатка, з `id` — правка своєї. */
export interface NoteDraft {
  /** Номер рядка: є — оновлюємо, немає — створюємо. */
  id?: number;
  text: string;
  tags: string[];
}

/** Відповідь `GET`: власні нотатки. */
export interface NoteListResponse {
  ok: boolean;
  notes: NoteRow[];
}

/** Відповідь `POST`: збережена нотатка. */
export interface NoteSaveResponse {
  ok: boolean;
  note: NoteRow | null;
}

/** Відповідь `DELETE`: чи справді рядок зник (чужого номера тут не буває). */
export interface NoteDeleteResponse {
  ok: boolean;
  /** Причина, коли `ok` — `false`. */
  error?: string;
}
