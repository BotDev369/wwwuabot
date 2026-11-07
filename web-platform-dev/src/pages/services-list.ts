/**
 * Сервіси платформи — **входи, а не слова**: кожен рядок веде на екран, який уже
 * існує, а підпис і назви груп беруться з рядка `scenarios` за ключем
 * (`docs/SCREEN_TEXTS.md`). Розділу-обгортки немає: оголошення, ігри й
 * користувачі — власні екрани, а не вкладки однієї сторінки.
 *
 * @module web-platform-dev/src/pages/services-list
 */

import type { IconName } from "@wwwuabot/shared";
import {
  ADS_PATH,
  CONTACTS_PATH,
  GAMES_PATH,
  MESSAGES_PATH,
  NOTES_PATH,
  ORDERS_PATH,
  PAGES_PATH,
  RESEARCH_PATH,
  USERS_PATH,
} from "../app/routes";

export interface ServiceEntry {
  key: string;
  /** Ключ групи (`community`, `content`, `personal`) — підпис групи живе в базі. */
  group: string;
  icon: IconName;
  /** Адреса екрана сервісу в межах платформи. */
  to: string;
  /** Номер голосу зі спектра теми (`--data-1…6`), а не конкретний колір. */
  tone: number;
}

/** Рядок `scenarios`, у якому лежать слова екрана «Сервіси». */
export const SERVICES_SCREEN_KEY = "services";
export const SERVICES_TITLE_KEY = "services.title";

/** Ключ підпису сервісу: `services.item.<key>`. */
export function serviceLabelKey(key: string): string {
  return `services.item.${key}`;
}

/** Ключ підпису групи: `services.group.<group>`. */
export function serviceGroupKey(group: string): string {
  return `services.group.${group}`;
}

/**
 * Список входів — те, що не має свого пункту в футері: трекери, розвиток і
 * аналіз дат стоять у смузі, тож рядками тут не повторюються.
 */
export const SERVICES: readonly ServiceEntry[] = [
  { key: "users", group: "community", tone: 1, icon: "users", to: USERS_PATH },
  { key: "contacts", group: "community", tone: 2, icon: "contact", to: CONTACTS_PATH },
  { key: "messages", group: "community", tone: 3, icon: "message-square", to: MESSAGES_PATH },
  { key: "pages", group: "content", tone: 4, icon: "page", to: PAGES_PATH },
  { key: "ads", group: "content", tone: 5, icon: "announce", to: ADS_PATH },
  { key: "research", group: "content", tone: 6, icon: "book", to: RESEARCH_PATH },
  { key: "notes", group: "personal", tone: 1, icon: "text", to: NOTES_PATH },
  { key: "orders", group: "personal", tone: 2, icon: "tag", to: ORDERS_PATH },
  { key: "games", group: "personal", tone: 3, icon: "game", to: GAMES_PATH },
];
