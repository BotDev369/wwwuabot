/**
 * NAVIGATION — навігація та взаємодія (таби, акордеон, меню, тема).
 */

import type { BlockDefinition } from "../../types/page-config";
import { block, s, b, e, oa } from "./helpers";

export const navigationBlocks: BlockDefinition[] = [
  block({
    type: "tabs",
    label: "Таби",
    icon: "tabs",
    category: "navigation",
    description: "Перемикач вкладок з різним контентом",
    props: {
      tabs: oa(
        "Вкладки",
        { label: s("Назва вкладки"), icon: s("Іконка"), content: s("Текстовий вміст") },
        ["label"],
      ),
    },
    required: ["tabs"],
    defaultProps: {
      tabs: [
        { label: "Вкладка 1", content: "" },
        { label: "Вкладка 2", content: "" },
      ],
    },
  }),
  block({
    type: "accordion",
    label: "Акордеон",
    icon: "accordion",
    category: "navigation",
    description: "Розгортувані/згортані секції",
    compatibleZones: ["main", "sidebar"],
    props: {
      items: oa("Секції", { title: s("Заголовок"), content: s("Вміст"), open: b("Розгорнутий") }, [
        "title",
        "content",
      ]),
      multiple: b("Дозволити кілька відкритих"),
    },
    required: ["items"],
    defaultProps: { items: [], multiple: false },
  }),
  block({
    type: "nav",
    label: "Меню",
    icon: "menu",
    category: "navigation",
    description: "Навігаційне меню з посиланнями",
    props: {
      items: oa("Пункти меню", { text: s("Текст"), url: s("URL"), icon: s("Іконка") }, ["text"]),
    },
    required: ["items"],
    defaultProps: {
      items: [
        { text: "Головна", url: "/" },
        { text: "Про нас", url: "#" },
        { text: "Контакти", url: "#" },
      ],
    },
  }),
  block({
    type: "theme",
    label: "Тема",
    icon: "sun",
    category: "navigation",
    description: "Перемикач світлої/темної теми та дизайн-системи",
    props: {
      variant: e("Вид перемикача", ["modal", "toggle", "compact"], { default: "modal" }),
      label: s("Текст кнопки", { default: "Тема" }),
      showLabel: b("Показувати назву", { default: true }),
    },
    defaultProps: { variant: "modal", label: "Тема", showLabel: true },
  }),
];
