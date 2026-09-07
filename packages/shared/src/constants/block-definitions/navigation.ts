/**
 * NAVIGATION — навігація та взаємодія
 *
 * Таби, акордеон, навігаційне меню.
 */

import type { BlockDefinition } from '../../types/page-config';

export const navigationBlocks: BlockDefinition[] = [
  {
    type: 'tabs',
    label: 'Таби',
    description: 'Перемикач вкладок з різним контентом',
    icon: 'tabs',
    category: 'navigation',
    compatibleZones: ['main'],
    schema: {
      type: 'object',
      properties: {
        tabs: {
          type: 'array',
          title: 'Вкладки',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', title: 'Назва вкладки' },
              icon: { type: 'string', title: 'Іконка (опціонально)' },
              content: { type: 'string', title: 'Текстовий вміст' },
            },
            required: ['label'],
          },
          minItems: 2,
        },
        style: {
          type: 'string',
          title: 'Стиль',
          enum: ['underline', 'pills', 'enclosed'],
          default: 'underline',
        },
      },
      required: ['tabs'],
    },
    defaultProps: {
      tabs: [
        { label: 'Вкладка 1', content: '' },
        { label: 'Вкладка 2', content: '' },
      ],
      style: 'underline',
    },
  },

  {
    type: 'accordion',
    label: 'Акордеон',
    description: 'Розгортувані/згортані секції',
    icon: 'arrow-down',
    category: 'navigation',
    compatibleZones: ['main', 'sidebar'],
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          title: 'Секції',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', title: 'Заголовок' },
              content: { type: 'string', title: 'Вміст' },
              open: { type: 'boolean', title: 'Розгорнутий', default: false },
            },
            required: ['title', 'content'],
          },
          minItems: 1,
        },
        multiple: {
          type: 'boolean',
          title: 'Дозволити кілька відкритих',
          default: false,
        },
      },
      required: ['items'],
    },
    defaultProps: {
      items: [],
      multiple: false,
    },
  },

  {
    type: "nav",
    label: "Меню",
    description: "Навігаційне меню з посиланнями",
    icon: "globe",
    category: "navigation",
    compatibleZones: ["header", "sidebar", "main", "footer"],
    schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          title: "Пункти меню",
          items: {
            type: "object",
            properties: {
              text: { type: "string", title: "Текст" },
              url: { type: "string", title: "URL" },
              icon: { type: "string", title: "Іконка" },
            },
            required: ["text"],
          },
          minItems: 1,
        },
        direction: {
          type: "string",
          title: "Напрямок",
          enum: ["horizontal", "vertical"],
          default: "horizontal",
        },
        align: {
          type: "string",
          title: "Вирівнювання",
          enum: ["left", "center", "right", "space-between"],
          default: "left",
        },
        style: {
          type: "string",
          title: "Стиль відображення",
          enum: ["links", "pills", "buttons", "underline"],
          default: "links",
        },
        fontSize: {
          type: "string",
          title: "Розмір тексту",
          enum: ["xs", "sm", "base", "lg", "xl"],
          enumNames: ["12px (XS)", "14px (S)", "16px (M)", "18px (L)", "20px (XL)"],
          default: "sm",
        },
        itemSpacing: {
          type: "string",
          title: "Відступ між пунктами",
          enum: ["none", "xs", "sm", "md", "lg", "xl"],
          enumNames: [
            "0px (Без відступу)",
            "4px (Компактний)",
            "8px (Стандартний)",
            "12px (Середній)",
            "16px (Просторий)",
            "24px (Широкий)",
          ],
          default: "sm",
        },
      },
      required: ["items"],
    },
    defaultProps: {
      items: [
        { text: "Головна", url: "/" },
        { text: "Про нас", url: "#" },
        { text: "Контакти", url: "#" },
      ],
      direction: "horizontal",
      align: "left",
      style: "links",
      fontSize: "sm",
      itemSpacing: "sm",
    },
  },
  {
    type: "theme",
    label: "Тема",
    description: "Перемикач світлої/темної теми та дизайн-системи",
    icon: "sun",
    category: "navigation",
    compatibleZones: ["header", "sidebar", "main", "footer"],
    schema: {
      type: "object",
      properties: {
        variant: {
          type: "string",
          title: "Вид перемикача",
          enum: ["modal", "toggle", "compact"],
          default: "modal",
        },
        label: {
          type: "string",
          title: "Текст кнопки",
          default: "Тема",
        },
        showLabel: {
          type: "boolean",
          title: "Показувати назву",
          default: true,
        },
        align: {
          type: "string",
          title: "Вирівнювання",
          enum: ["left", "center", "right"],
          default: "left",
        },
      },
    },
    defaultProps: {
      variant: "modal",
      label: "Тема",
      showLabel: true,
      align: "left",
    },
  },
];
