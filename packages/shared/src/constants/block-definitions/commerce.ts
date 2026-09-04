/**
 * COMMERCE — комерційні блоки
 *
 * Ціни, відгуки, фічі, FAQ.
 */

import type { BlockDefinition } from '../../types/page-config';

export const commerceBlocks: BlockDefinition[] = [
  {
    type: 'pricing',
    label: 'Ціни',
    description: 'Картка з ціною та переліком можливостей',
    icon: 'tag',
    category: 'commerce',
    compatibleZones: ['main'],
    schema: {
      type: 'object',
      properties: {
        plans: {
          type: 'array',
          title: 'Тарифні плани',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', title: 'Назва' },
              price: { type: 'string', title: 'Ціна' },
              period: { type: 'string', title: 'Період', default: '/міс' },
              features: {
                type: 'array',
                title: 'Можливості',
                items: { type: 'string' },
              },
              highlighted: { type: 'boolean', title: 'Виділений', default: false },
              ctaText: { type: 'string', title: 'Текст кнопки', default: 'Обрати' },
            },
            required: ['name', 'price'],
          },
          minItems: 1,
        },
        columns: {
          type: 'string',
          title: 'Кількість колонок',
          enum: ['auto', '2', '3'],
          default: 'auto',
        },
      },
      required: ['plans'],
    },
    defaultProps: {
      plans: [],
      columns: 'auto',
    },
  },

  {
    type: 'testimonial',
    label: 'Відгук',
    description: 'Відгук клієнта з фото та підписом',
    icon: 'message-square',
    category: 'commerce',
    compatibleZones: ['main', 'sidebar'],
    schema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          title: 'Текст відгуку',
        },
        author: {
          type: 'string',
          title: 'Автор',
        },
        role: {
          type: 'string',
          title: 'Посада',
        },
        avatar: {
          type: 'string',
          title: 'URL аватара',
          format: 'uri',
        },
        rating: {
          type: 'number',
          title: 'Рейтинг (0-5)',
        },
      },
      required: ['text', 'author'],
    },
    defaultProps: {
      text: '',
      author: '',
      role: '',
      avatar: '',
      rating: 0,
    },
  },

  {
    type: 'feature-card',
    label: 'Фіча',
    description: 'Карточка з іконкою, заголовком та описом',
    icon: 'sparkles',
    category: 'commerce',
    compatibleZones: ['main'],
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          title: 'Фічі',
          items: {
            type: 'object',
            properties: {
              icon: { type: 'string', title: 'Іконка (SVG або назва)' },
              title: { type: 'string', title: 'Заголовок' },
              description: { type: 'string', title: 'Опис' },
            },
            required: ['title'],
          },
          minItems: 1,
        },
        columns: {
          type: 'string',
          title: 'Кількість колонок',
          enum: ['2', '3'],
          default: '2',
        },
      },
      required: ['items'],
    },
    defaultProps: {
      items: [],
      columns: '2',
    },
  },

  {
    type: 'faq',
    label: 'FAQ',
    description: 'Часто задавані питання (акордеон)',
    icon: 'search',
    category: 'commerce',
    compatibleZones: ['main', 'sidebar'],
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          title: 'Питання',
          items: {
            type: 'object',
            properties: {
              question: { type: 'string', title: 'Питання' },
              answer: { type: 'string', title: 'Відповідь' },
            },
            required: ['question', 'answer'],
          },
          minItems: 1,
        },
        title: {
          type: 'string',
          title: 'Заголовок секції',
          default: 'Часті питання',
        },
      },
      required: ['items'],
    },
    defaultProps: {
      items: [],
      title: 'Часті питання',
    },
  },
];
