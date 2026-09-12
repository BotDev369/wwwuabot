/**
 * DATA — відображення даних (статистика, прогрес, таблиці, рейтинг).
 */

import type { BlockDefinition } from "../../types/page-config";
import { block, s, n, b, e, sa } from "./helpers";

export const dataBlocks: BlockDefinition[] = [
  block({
    type: "stat",
    label: "Статистика",
    icon: "bar-chart",
    category: "data",
    description: "Карточка з числом-метрикою та підписом",
    compatibleZones: ["main", "sidebar", "header"],
    props: {
      value: s("Значення"),
      label: s("Мітка"),
      description: s("Опис"),
      icon: s("Іконка"),
      trend: e("Тренд", ["up", "down", "neutral"], { default: "neutral" }),
      trendValue: s("Значення тренду"),
    },
    required: ["value", "label"],
    defaultProps: {
      value: "0",
      label: "",
      description: "",
      icon: "",
      trend: "neutral",
      trendValue: "",
    },
  }),
  block({
    type: "progress",
    label: "Прогрес",
    icon: "bar-chart",
    category: "data",
    description: "Індикатор прогресу або рівня заповнення",
    compatibleZones: ["main", "sidebar"],
    props: {
      value: n("Поточне значення", { default: 0 }),
      max: n("Максимальне значення", { default: 100 }),
      label: s("Мітка"),
      showPercent: b("Показувати %", { default: true }),
      color: e("Колір", ["accent", "green", "yellow", "red"], { default: "accent" }),
    },
    required: ["value"],
    defaultProps: { value: 0, max: 100, label: "", showPercent: true, color: "accent" },
  }),
  block({
    type: "table",
    label: "Таблиця",
    icon: "clipboard",
    category: "data",
    description: "Таблиця даних з заголовками",
    props: {
      headers: sa("Заголовки"),
      rows: { type: "array", title: "Рядки", items: { type: "array", items: { type: "string" } } },
      striped: b("Зебра-рядки", { default: true }),
      bordered: b("З рамкою", { default: true }),
    },
    required: ["headers", "rows"],
    defaultProps: { headers: [], rows: [], striped: true, bordered: true },
  }),
  block({
    type: "rating",
    label: "Рейтинг",
    icon: "star",
    category: "data",
    description: "Відображення рейтингу зірками",
    compatibleZones: ["main", "sidebar"],
    props: {
      value: n("Рейтинг", { default: 0 }),
      max: n("Максимум", { default: 5 }),
      label: s("Мітка"),
      size: e("Розмір", ["sm", "md", "lg"], { default: "md" }),
    },
    required: ["value"],
    defaultProps: { value: 0, max: 5, label: "", size: "md" },
  }),
];
