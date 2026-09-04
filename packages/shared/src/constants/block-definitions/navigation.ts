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
    type: 'nav',
    label: 'Навігація',
    description: 'Меню з посиланнями',
    icon: 'globe',
    category: 'navigation',
    compatibleZones: ['sidebar', 'header', 'footer'],
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          title: 'Посилання',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string', title: 'Текст' },
              url: { type: 'string', title: 'URL' },
              icon: { type: 'string', title: 'Іконка' },
            },
            required: ['text'],
          },
          minItems: 1,
        },
        direction: {
          type: 'string',
          title: 'Напрямок',
          enum: ['horizontal', 'vertical'],
          default: 'vertical',
        },
      },
      required: ['items'],
    },
    defaultProps: {
      items: [],
      direction: 'vertical',
    },
  },
];
