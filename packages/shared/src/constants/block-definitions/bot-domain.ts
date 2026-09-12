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
    description: "Форма введення дат для порівняння",
    props: {
      title: s("Заголовок", { default: "Співставлення дат" }),
      description: s("Опис"),
      maxDates: n("Максимум дат", { default: 10 }),
      nextUrl: s("URL наступного кроку", { default: "/mydate/compare/systems" }),
    },
    defaultProps: {
      title: "Співставлення дат",
      description: "Вкажіть дати для аналізу.",
      maxDates: 10,
      nextUrl: "/mydate/compare/systems",
    },
  }),
  block({
    type: "compare-systems",
    label: "Вибір систем",
    icon: "eye",
    category: "bot-domain",
    description: "Вибір систем аналізу та параметрів для порівняння дат",
    props: {
      title: s("Заголовок", { default: "Оберіть системи та параметри" }),
      resultUrl: s("URL результатів", { default: "/mydate" }),
      paramKey: s("Query-параметр для дат", { default: "dates" }),
      systemKey: s("Query-параметр для систем", { default: "sys" }),
      parameterKey: s("Query-параметр для параметрів", { default: "p" }),
    },
    defaultProps: {
      title: "Оберіть системи та параметри",
      resultUrl: "/mydate",
      paramKey: "dates",
      systemKey: "sys",
      parameterKey: "p",
    },
  }),
  block({
    type: "compare-table",
    label: "Таблиця порівняння",
    icon: "compare",
    category: "bot-domain",
    description: "Матриця порівняння дат за системами аналізу",
    props: {
      title: s("Заголовок", { default: "Співставлення дат" }),
      backUrl: s("URL назад", { default: "/mydate/compare" }),
      paramKey: s("Query-параметр для дат", { default: "dates" }),
      systemKey: s("Query-параметр для систем", { default: "sys" }),
      parameterKey: s("Query-параметр для параметрів", { default: "p" }),
    },
    defaultProps: {
      title: "Співставлення дат",
      backUrl: "/mydate/compare",
      paramKey: "dates",
      systemKey: "sys",
      parameterKey: "p",
    },
  }),
  block({
    type: "date-analysis",
    label: "Аналіз дати",
    icon: "sparkles",
    category: "bot-domain",
    description: "Аналіз однієї дати з картками систем",
    props: {
      title: s("Заголовок", { default: "Аналіз дати" }),
      dateSource: e("Джерело дати", ["url", "custom"], { default: "url" }),
      customDate: s("Власна дата"),
      backUrl: s("URL назад", { default: "/mydate" }),
    },
    defaultProps: { title: "Аналіз дати", dateSource: "url", customDate: "", backUrl: "/mydate" },
  }),
];
