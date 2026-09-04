/**
 * LAYOUT — структурні блоки
 *
 * Кнопки, списки, розділювачі, відступи, колонки, картки, hero.
 */

import type { BlockDefinition } from '../../types/page-config';

export const layoutBlocks: BlockDefinition[] = [
  {
    type: 'buttons',
    label: 'Кнопки',
    description: 'Група кнопок (посилання або дії)',
    icon: 'buttons',
    category: 'layout',
    compatibleZones: ['main', 'footer'],
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          title: 'Кнопки',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string', title: 'Текст кнопки' },
              url: { type: 'string', title: 'Посилання (опціонально)', format: 'uri' },
              action: { type: 'string', title: 'Дія (опціонально)' },
              variant: {
                type: 'string',
                title: 'Стиль',
                enum: ['primary', 'secondary', 'outline', 'ghost'],
                default: 'primary',
              },
              icon: { type: 'string', title: 'Іконка (опціонально)' },
            },
            required: ['text'],
          },
          minItems: 1,
        },
        layout: {
          type: 'string',
          title: 'Розташування',
          enum: ['row', 'column', 'grid'],
          default: 'row',
        },
      },
      required: ['items'],
    },
    defaultProps: {
      items: [],
      layout: 'row',
    },
  },

  {
    type: 'list',
    label: 'Список',
    description: 'Нумерований або маркірований список елементів',
    icon: 'list',
    category: 'layout',
    compatibleZones: ['main', 'sidebar'],
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          title: 'Елементи',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string', title: 'Текст елемента' },
              icon: { type: 'string', title: 'Іконка (опціонально)' },
              description: { type: 'string', title: 'Опис (опціонально)' },
            },
            required: ['text'],
          },
          minItems: 1,
        },
        ordered: {
          type: 'boolean',
          title: 'Нумерований',
          default: false,
        },
      },
      required: ['items'],
    },
    defaultProps: {
      items: [],
      ordered: false,
    },
  },

  {
    type: 'divider',
    label: 'Розділювач',
    description: 'Горизонтальна лінія-розділювач',
    icon: 'divider',
    category: 'layout',
    compatibleZones: ['main', 'sidebar', 'header', 'footer'],
    schema: {
      type: 'object',
      properties: {
        style: {
          type: 'string',
          title: 'Стиль лінії',
          enum: ['solid', 'dashed', 'dotted', 'gradient'],
          default: 'solid',
        },
        spacing: {
          type: 'string',
          title: 'Відступи',
          enum: ['none', 'sm', 'md', 'lg'],
          default: 'md',
        },
      },
    },
    defaultProps: {
      style: 'solid',
      spacing: 'md',
    },
  },

  {
    type: 'spacer',
    label: 'Відступ',
    description: 'Вертикальний відступ між блоками',
    icon: 'construction',
    category: 'layout',
    compatibleZones: ['main', 'sidebar', 'header', 'footer'],
    schema: {
      type: 'object',
      properties: {
        height: {
          type: 'string',
          title: 'Висота',
          enum: ['xs', 'sm', 'md', 'lg', 'xl', '2xl'],
          default: 'md',
        },
      },
    },
    defaultProps: {
      height: 'md',
    },
  },

  {
    type: 'columns',
    label: 'Колонки',
    description: 'Контейнер з 2 або 3 колонками (діти блоки в кожній)',
    icon: 'layout',
    category: 'layout',
    compatibleZones: ['main'],
    schema: {
      type: 'object',
      properties: {
        count: {
          type: 'string',
          title: 'Кількість стовпців',
          enum: ['2', '3'],
          default: '2',
        },
        gap: {
          type: 'string',
          title: 'Відстань',
          enum: ['sm', 'md', 'lg'],
          default: 'md',
        },
        columns: {
          type: 'array',
          title: 'Колонки',
          description: 'Кожна колонка містить вкладені блоки',
          items: {
            type: 'object',
            properties: {
              width: {
                type: 'string',
                title: 'Ширина',
                enum: ['auto', '1/3', '1/2', '2/3'],
                default: 'auto',
              },
              children: {
                type: 'array',
                title: 'Блоки колонки',
              },
            },
          },
          minItems: 2,
        },
      },
      required: ['columns'],
    },
    defaultProps: {
      count: '2',
      gap: 'md',
      columns: [
        { width: 'auto', children: [] },
        { width: 'auto', children: [] },
      ],
    },
  },

  {
    type: 'card',
    label: 'Картка',
    description: 'Контейнер з фоном, рамкою та заголовком',
    icon: 'card',
    category: 'layout',
    compatibleZones: ['main', 'sidebar'],
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          title: 'Заголовок',
        },
        description: {
          type: 'string',
          title: 'Опис',
        },
        padding: {
          type: 'string',
          title: 'Внутрішній відступ',
          enum: ['sm', 'md', 'lg'],
          default: 'md',
        },
        bordered: {
          type: 'boolean',
          title: 'З рамкою',
          default: true,
        },
        elevated: {
          type: 'boolean',
          title: 'З тінню',
          default: false,
        },
      },
    },
    defaultProps: {
      title: '',
      description: '',
      padding: 'md',
      bordered: true,
      elevated: false,
    },
  },

  {
    type: 'hero',
    label: 'Hero',
    description: 'Великий блок із заголовком, підзаголовком та CTA-кнопками',
    icon: 'sparkles',
    category: 'layout',
    compatibleZones: ['main', 'header'],
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          title: 'Головний заголовок',
        },
        subtitle: {
          type: 'string',
          title: 'Підзаголовок',
        },
        backgroundImage: {
          type: 'string',
          title: 'Фонове зображення',
          format: 'uri',
        },
        buttons: {
          type: 'array',
          title: 'Кнопки CTA',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string', title: 'Текст' },
              url: { type: 'string', title: 'Посилання' },
              variant: {
                type: 'string',
                enum: ['primary', 'secondary'],
                default: 'primary',
              },
            },
            required: ['text'],
          },
        },
        align: {
          type: 'string',
          title: 'Вирівнювання',
          enum: ['left', 'center', 'right'],
          default: 'center',
        },
      },
      required: ['title'],
    },
    defaultProps: {
      title: '',
      subtitle: '',
      backgroundImage: '',
      buttons: [],
      align: 'center',
    },
  },
];
