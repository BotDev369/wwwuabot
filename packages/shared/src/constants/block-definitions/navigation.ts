/**
 * NAVIGATION — навігація та взаємодія (таби, акордеон, меню, тема).
 */

import type { BlockDefinition } from '../../types/page-config';
import { block, s, b, e, oa } from './helpers';

export const navigationBlocks: BlockDefinition[] = [
  block({
    type: "tabs", label: "Таби", icon: "tabs", category: "navigation",
    description: "Перемикач вкладок з різним контентом",
    props: {
      tabs: oa("Вкладки", { label: s("Назва вкладки"), icon: s("Іконка"), content: s("Текстовий вміст") }, ["label"]),
      style: e("Стиль", ["underline", "pills", "enclosed"], { default: "underline" }),
    },
    required: ["tabs"],
    defaultProps: { tabs: [{ label: "Вкладка 1", content: "" }, { label: "Вкладка 2", content: "" }], style: "underline" },
  }),
  block({
    type: "accordion", label: "Акордеон", icon: "arrow-down", category: "navigation",
    description: "Розгортувані/згортані секції",
    compatibleZones: ["main", "sidebar"],
    props: {
      items: oa("Секції", { title: s("Заголовок"), content: s("Вміст"), open: b("Розгорнутий") }, ["title", "content"]),
      multiple: b("Дозволити кілька відкритих"),
    },
    required: ["items"],
    defaultProps: { items: [], multiple: false },
  }),
  block({
    type: "nav", label: "Меню", icon: "globe", category: "navigation",
    description: "Навігаційне меню з посиланнями",
    props: {
      items: oa("Пункти меню", { text: s("Текст"), url: s("URL"), icon: s("Іконка") }, ["text"]),
      direction: e("Напрямок", ["horizontal", "vertical"], { default: "horizontal" }),
      align: e("Вирівнювання", ["left", "center", "right", "space-between"], { default: "left" }),
      style: e("Стиль відображення", ["links", "pills", "buttons", "underline"], { default: "links" }),
      fontSize: e("Розмір тексту", ["xs", "sm", "base", "lg", "xl"], { default: "sm" }),
      itemSpacing: e("Відступ між пунктами", ["none", "xs", "sm", "md", "lg", "xl"], { default: "sm" }),
    },
    required: ["items"],
    defaultProps: {
      items: [{ text: "Головна", url: "/" }, { text: "Про нас", url: "#" }, { text: "Контакти", url: "#" }],
      direction: "horizontal", align: "left", style: "links", fontSize: "sm", itemSpacing: "sm",
    },
  }),
  block({
    type: "theme", label: "Тема", icon: "sun", category: "navigation",
    description: "Перемикач світлої/темної теми та дизайн-системи",
    props: {
      variant: e("Вид перемикача", ["modal", "toggle", "compact"], { default: "modal" }),
      label: s("Текст кнопки", { default: "Тема" }),
      showLabel: b("Показувати назву", { default: true }),
      align: e("Вирівнювання", ["left", "center", "right"], { default: "left" }),
    },
    defaultProps: { variant: "modal", label: "Тема", showLabel: true, align: "left" },
  }),
];
