/**
 * Сервіси платформи — **дані**, а не розмітка: кожен рядок веде на екран, який
 * уже існує, а знак той самий, що в хабі I.
 *
 * @module web-platform-dev/src/pages/services-list
 */

import type { IconName } from "@wwwuabot/shared";
import { DATE_ANALYSIS_PATH } from "@wwwuabot/shared/content";
import {
  ASSESSMENTS_PATH,
  CONTACTS_PATH,
  MESSAGES_PATH,
  NOTES_PATH,
  PAGES_PATH,
  SPACE_PATH,
} from "../app/routes";

export interface ServiceEntry {
  key: string;
  label: string;
  icon: IconName;
  /** Адреса екрана сервісу в межах платформи. */
  to: string;
}

export const SERVICES: readonly ServiceEntry[] = [
  { key: "space", label: "Простір", icon: "users", to: SPACE_PATH },
  { key: "dates", label: "Аналіз дат", icon: "my-dates", to: DATE_ANALYSIS_PATH },
  { key: "notes", label: "Нотатки", icon: "text", to: NOTES_PATH },
  { key: "contacts", label: "Контакти", icon: "contact", to: CONTACTS_PATH },
  { key: "messages", label: "Повідомлення", icon: "message-square", to: MESSAGES_PATH },
  { key: "pages", label: "Сторінки", icon: "page", to: PAGES_PATH },
  { key: "assessments", label: "Розвиток", icon: "checklist", to: ASSESSMENTS_PATH },
];
