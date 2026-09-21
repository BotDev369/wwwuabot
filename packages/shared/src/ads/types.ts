/**
 * Оголошення — рядок таблиці `ads`.
 *
 * **Чому не `scenarios`.** Там `slug` — `NOT NULL UNIQUE`, тобто це
 * *опублікований контент із адресою*: сторінка, яку відкривають за посиланням.
 * Оголошення адреси не має й ніколи не матиме — його читають **у стрічці**, і
 * правила в нього свої (вид, ціна, місто, зняти з дошки). Поклавши його в
 * `scenarios`, ми мали б вигадувати `slug` для кожного рядка й другий фільтр
 * видимості в тій самій таблиці — та сама пастка, що колись дала дві копії
 * сценаріїв (AGENTS.md §7).
 *
 * @module @wwwuabot/shared/ads
 */

import type { AdKind } from "./rules";

/** Оголошення, як воно лежить у базі й їде в клієнт. */
export interface Ad {
  id: number;
  /** Telegram-id того, хто написав: ідентичність із **підписаного** `initData`. */
  ownerId: number;
  kind: AdKind;
  title: string;
  body: string;
  /** Ціна текстом: «договірна», «2 000 ₴», «за домовленістю». */
  price: string;
  place: string;
  /** `false` — чернетка: видно власникові, немає на дошці. */
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Те, що надсилає форма: без `id` — нове, з `id` — правка свого. */
export interface AdDraft {
  /** Номер рядка: є — оновлюємо, немає — створюємо. */
  id?: number;
  kind: AdKind;
  title: string;
  body: string;
  price: string;
  place: string;
  isActive?: boolean;
}

/** Відповідь `GET /api/user/ads`: власні оголошення (і чернетки теж). */
export interface AdListResponse {
  ok: boolean;
  ads: Ad[];
}

/** Відповідь `POST /api/user/ads`: збережене оголошення. */
export interface AdSaveResponse {
  ok: boolean;
  ad: Ad | null;
  error?: string;
}

/** Відповідь `DELETE /api/user/ads`: чи справді рядок зник. */
export interface AdDeleteResponse {
  ok: boolean;
  error?: string;
}

/** Відповідь `GET /api/space/ads`: чужа дошка — лише опубліковане. */
export interface AdBoardResponse {
  ok: boolean;
  ads: Ad[];
}
