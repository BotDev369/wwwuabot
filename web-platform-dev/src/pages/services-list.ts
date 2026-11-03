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
  label: string;
  icon: IconName;
  /** Адреса екрана сервісу в межах платформи. */
  to: string;
  /**
   * Підпис групи: сусідні входи з тим самим підписом стоять під ним.
   *
   * Групи тут не заради краси: дев'ять однакових рядків поспіль не давали
   * оку зачепитись, і людина читала список щоразу з початку. Три групи по три
   * входи відповідають на «з ким», «що» і «для себе» — і кожна влазить в екран.
   */
  group: string;
  /** Номер голосу зі спектра теми (`--data-1…6`), а не конкретний колір. */
  tone: number;
}

/**
 * **Список входів — те, що не має свого пункту в футері.** Трекери, розвиток
 * і аналіз дат стоять у смузі, тож рядками тут не повторюються: два входи в
 * один екран означають, що за один із них забудуть.
 */
export const SERVICES: readonly ServiceEntry[] = [
  // Спільнота: люди й те, що між ними.
  {
    key: "users",
    group: "Спільнота",
    tone: 1,
    label: "Користувачі",
    icon: "users",
    to: USERS_PATH,
  },
  {
    key: "contacts",
    group: "Спільнота",
    tone: 2,
    label: "Контакти",
    icon: "contact",
    to: CONTACTS_PATH,
  },
  {
    key: "messages",
    group: "Спільнота",
    tone: 3,
    label: "Повідомлення",
    icon: "message-square",
    to: MESSAGES_PATH,
  },
  // Контент: те, що людина публікує й читає.
  { key: "pages", group: "Контент", tone: 4, label: "Сторінки", icon: "page", to: PAGES_PATH },
  { key: "ads", group: "Контент", tone: 5, label: "Оголошення", icon: "announce", to: ADS_PATH },
  {
    key: "research",
    group: "Контент",
    tone: 6,
    label: "Дослідження",
    icon: "book",
    to: RESEARCH_PATH,
  },
  // Особисте: власні записи, робота й дозвілля.
  { key: "notes", group: "Особисте", tone: 1, label: "Нотатки", icon: "text", to: NOTES_PATH },
  { key: "orders", group: "Особисте", tone: 2, label: "Замовлення", icon: "tag", to: ORDERS_PATH },
  { key: "games", group: "Особисте", tone: 3, label: "Ігри", icon: "game", to: GAMES_PATH },
];
