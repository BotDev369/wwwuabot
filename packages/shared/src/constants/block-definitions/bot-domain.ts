/**
 * BOT-DOMAIN — специфічні для бота блоки (профіль, дати, MyDate модулі).
 */

import type { BlockDefinition } from "../../types/page-config";
import { block, s, n, b, e } from "./helpers";

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
    type: "date-input",
    label: "Ввід дати",
    icon: "calendar",
    category: "bot-domain",
    description: "Поле однієї дати, яке веде на сторінку аналізу",
    props: {
      label: s("Підпис поля", { default: "Дата народження" }),
      buttonLabel: s("Напис кнопки", { default: "Показати аналіз" }),
      basePath: s("Адреса сторінки-власника", { default: "/mydate" }),
      targetPath: s("Сегмент сторінки аналізу", { default: "analysis" }),
      min: s("Найраніша дата", { default: "1900-01-01" }),
      max: s("Найпізніша дата", { default: "2100-12-31" }),
    },
    defaultProps: {
      label: "Дата народження",
      buttonLabel: "Показати аналіз",
      basePath: "/mydate",
      targetPath: "analysis",
      min: "1900-01-01",
      max: "2100-12-31",
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
  block({
    type: "compare-setup",
    label: "Введення дат",
    icon: "compare",
    category: "bot-domain",
    description: "Ручне введення дат для аналізу — другий вхід у той самий екран",
    props: {
      title: s("Заголовок", { default: "Аналіз Дат" }),
      description: s("Опис"),
      maxDates: n("Максимум дат", { default: 10 }),
      nextUrl: s("URL наступного кроку", { default: "/mydate/analysis" }),
    },
    defaultProps: {
      title: "Аналіз Дат",
      description: "Вкажіть дати для аналізу.",
      maxDates: 10,
      nextUrl: "/mydate/analysis",
    },
  }),
  block({
    type: "date-analysis",
    label: "Аналіз Дат",
    icon: "bar-chart",
    category: "bot-domain",
    description: "Таблиця аналізу: параметри й значення — дат одна або більше",
    props: {
      title: s("Підпис над таблицею", { default: "Результат аналізу:" }),
      backUrl: s("URL назад", { default: "/mydate" }),
      targetUrl: s("URL вибору систем", { default: "/mydate/analysis" }),
    },
    defaultProps: {
      title: "Результат аналізу:",
      backUrl: "/mydate",
      targetUrl: "/mydate/analysis",
    },
  }),
];
