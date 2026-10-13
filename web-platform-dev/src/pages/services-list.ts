/**
 * Сервіси платформи — **дані**, а не розмітка: кожен рядок веде на екран, який
 * уже існує, а знак той самий, що в рядках акаунта.
 *
 * **Розділу-обгортки тут немає.** Оголошення, ігри й користувачі — власні
 * екрани з власними адресами, а не вкладки однієї сторінки: список входів
 * лишається списком, а не другою навігацією.
 *
 * @module web-platform-dev/src/pages/services-list
 */

import type { IconName } from "@wwwuabot/shared";
import { DATE_ANALYSIS_PATH } from "@wwwuabot/shared/content";
import {
  ADS_PATH,
  ASSESSMENTS_PATH,
  CONTACTS_PATH,
  GAMES_PATH,
  MESSAGES_PATH,
  NOTES_PATH,
  ORDERS_PATH,
  PAGES_PATH,
  USERS_PATH,
} from "../app/routes";

export interface ServiceEntry {
  key: string;
  label: string;
  icon: IconName;
  /** Адреса екрана сервісу в межах платформи. */
  to: string;
}

export const SERVICES: readonly ServiceEntry[] = [
  { key: "ads", label: "Оголошення", icon: "announce", to: ADS_PATH },
  { key: "dates", label: "Аналіз дат", icon: "my-dates", to: DATE_ANALYSIS_PATH },
  { key: "pages", label: "Сторінки", icon: "page", to: PAGES_PATH },
  { key: "games", label: "Ігри", icon: "game", to: GAMES_PATH },
  { key: "notes", label: "Нотатки", icon: "text", to: NOTES_PATH },
  { key: "contacts", label: "Контакти", icon: "contact", to: CONTACTS_PATH },
  { key: "messages", label: "Повідомлення", icon: "message-square", to: MESSAGES_PATH },
  { key: "users", label: "Користувачі", icon: "users", to: USERS_PATH },
  { key: "orders", label: "Замовлення", icon: "tag", to: ORDERS_PATH },
  { key: "assessments", label: "Розвиток", icon: "checklist", to: ASSESSMENTS_PATH },
];
