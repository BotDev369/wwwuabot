/**
 * LAYOUT — структурні блоки (кнопки, списки, розділювачі, відступи, колонки, картки, hero).
 */

import type { BlockDefinition } from '../../types/page-config';
import { block, s, b, e, oa } from './helpers';

export const layoutBlocks: BlockDefinition[] = [
  block({
    type: "link-button", label: "Кнопка посилання", icon: "link", category: "layout",
    description: "Кнопка з переходом за посиланням (URL)",
    props: {
      text: s("Текст кнопки"), url: s("Посилання (URL)", { format: "uri" }),
      target: e("Відкривати в", ["_blank", "_self"], { default: "_blank" }),
      variant: e("Стиль кнопки", ["primary", "secondary", "outline", "ghost"], { default: "primary" }),
      size: e("Розмір", ["sm", "md", "lg"], { default: "md" }),
      align: e("Вирівнювання", ["left", "center", "right", "full"], { default: "left" }),
      icon: s("Іконка (опціонально)"),
    },
    required: ["text", "url"],
    defaultProps: { text: "Перейти за посиланням", url: "https://", target: "_blank", variant: "primary", size: "md", align: "left" },
  }),
  block({
    type: "buttons", label: "Кнопки", icon: "buttons", category: "layout",
    description: "Група кнопок (посилання або дії)",
    props: {
      items: oa("Кнопки", {
        text: s("Текст кнопки"), url: s("Посилання", { format: "uri" }), action: s("Дія"),
        variant: e("Стиль", ["primary", "secondary", "outline", "ghost"], { default: "primary" }),
        icon: s("Іконка"),
      }, ["text"]),
      layout: e("Розташування", ["row", "column", "grid"], { default: "row" }),
    },
    required: ["items"],
    defaultProps: { items: [{ text: "Кнопка", url: "#", variant: "primary" }], layout: "row" },
  }),
  block({
    type: "list", label: "Список", icon: "list", category: "layout",
    description: "Нумерований або маркірований список елементів",
    compatibleZones: ["main", "sidebar"],
    props: {
      items: oa("Елементи", { text: s("Текст елемента"), icon: s("Іконка"), description: s("Опис") }, ["text"]),
      ordered: b("Нумерований"),
    },
    required: ["items"],
    defaultProps: { items: [], ordered: false },
  }),
  block({
    type: "divider", label: "Розділювач", icon: "divider", category: "layout",
    description: "Горизонтальна лінія-розділювач",
    props: {
      style: e("Стиль лінії", ["solid", "dashed", "dotted", "gradient"], { default: "solid" }),
      spacing: e("Відступи", ["none", "sm", "md", "lg"], { default: "md" }),
    },
    defaultProps: { style: "solid", spacing: "md" },
  }),
  block({
    type: "spacer", label: "Відступ", icon: "construction", category: "layout",
    description: "Вертикальний відступ між блоками",
    props: { height: e("Висота", ["xs", "sm", "md", "lg", "xl", "2xl"], { default: "md" }) },
    defaultProps: { height: "md" },
  }),
  block({
    type: "columns", label: "Колонки", icon: "layout", category: "layout",
    description: "Контейнер з 2 або 3 колонками (діти блоки в кожній)",
    props: {
      count: e("Кількість стовпців", ["2", "3"], { default: "2" }),
      gap: e("Відстань", ["sm", "md", "lg"], { default: "md" }),
      columns: oa("Колонки", { width: e("Ширина", ["auto", "1/3", "1/2", "2/3"], { default: "auto" }) }),
    },
    required: ["columns"],
    defaultProps: { count: "2", gap: "md", columns: [{ width: "auto" }, { width: "auto" }] },
  }),
  block({
    type: "card", label: "Картка", icon: "card", category: "layout",
    description: "Контейнер з фоном, рамкою та заголовком",
    compatibleZones: ["main", "sidebar"],
    props: {
      title: s("Заголовок"), description: s("Опис"),
      padding: e("Внутрішній відступ", ["sm", "md", "lg"], { default: "md" }),
      bordered: b("З рамкою", { default: true }), elevated: b("З тінню"),
    },
    defaultProps: { title: "", description: "", padding: "md", bordered: true, elevated: false },
  }),
  block({
    type: "hero", label: "Hero", icon: "sparkles", category: "layout",
    description: "Великий блок із заголовком, підзаголовком та CTA-кнопками",
    compatibleZones: ["main", "header"],
    props: {
      title: s("Головний заголовок"), subtitle: s("Підзаголовок"),
      backgroundImage: s("Фонове зображення", { format: "uri" }),
      buttons: oa("Кнопки CTA", { text: s("Текст"), url: s("Посилання"), variant: e("Стиль", ["primary", "secondary"], { default: "primary" }) }, ["text"]),
      align: e("Вирівнювання", ["left", "center", "right"], { default: "center" }),
    },
    required: ["title"],
    defaultProps: { title: "", subtitle: "", backgroundImage: "", buttons: [], align: "center" },
  }),
];
