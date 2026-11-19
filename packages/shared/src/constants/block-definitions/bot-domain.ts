/**
 * BOT-DOMAIN — специфічні для бота блоки (профіль, дати, «Аналіз дат»).
 */

import type { BlockDefinition } from "../../types/page-config";
import { block, s, b, e } from "./helpers";

export const botDomainBlocks: BlockDefinition[] = [
  block({
    type: "user-profile",
    label: "Профіль",
    icon: "user",
    category: "bot-domain",
    description: "Інформація про користувача Telegram (аватар, ім'я, ID)",
    compatibleZones: ["main", "sidebar"],
    props: {
      showAvatar: b("Показувати аватар", { default: true }),
      showName: b("Показувати ім'я", { default: true }),
      showUsername: b("Показувати @username", { default: true }),
      showId: b("Показувати ID"),
      layout: e("Розташування", ["card", "inline", "compact"], { default: "card" }),
    },
    defaultProps: {
      showAvatar: true,
      showName: true,
      showUsername: true,
      showId: false,
      layout: "card",
    },
  }),
  block({
    type: "date-card",
    label: "Дата",
    icon: "calendar",
    category: "bot-domain",
    description: "Астрологічна картка дати з розрахунками",
    compatibleZones: ["main", "sidebar"],
    props: {
      dateSource: e("Джерело дати", ["user-birthday", "custom"], { default: "user-birthday" }),
      customDate: s("Власна дата"),
      showZodiac: b("Показувати знак зодіаку", { default: true }),
      showElement: b("Показувати стихію", { default: true }),
      showNumerology: b("Показувати нумерологію", { default: true }),
      layout: e("Розташування", ["full", "compact", "minimal"], { default: "full" }),
    },
    defaultProps: {
      dateSource: "user-birthday",
      customDate: "",
      showZodiac: true,
      showElement: true,
      showNumerology: true,
      layout: "full",
    },
  }),
  block({
    type: "my-dates-table",
    label: "Таблиця дат",
    icon: "my-dates",
    category: "bot-domain",
    description: "Таблиця з CRUD-операціями для управління датами",
    props: {
      showSearch: b("Показувати пошук", { default: true }),
      showTypeFilter: b("Показувати фільтр типів", { default: true }),
      showBulkActions: b("Показувати масові дії", { default: true }),
      showCreateButton: b("Показувати кнопку створення", { default: true }),
    },
    defaultProps: {
      showSearch: true,
      showTypeFilter: true,
      showBulkActions: true,
      showCreateButton: true,
    },
  }),
];
