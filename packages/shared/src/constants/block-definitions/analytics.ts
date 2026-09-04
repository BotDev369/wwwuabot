/**
 * ANALYTICS — аналітичні блоки
 *
 * Графіки (стовпчиковий, круговий).
 */

import type { BlockDefinition } from '../../types/page-config';

export const analyticsBlocks: BlockDefinition[] = [
  {
    type: 'chart',
    label: 'Графік',
    description: 'Простий стовпчиковий або круговий графік',
    icon: 'bar-chart',
    category: 'analytics',
    compatibleZones: ['main'],
    schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          title: 'Тип графіка',
          enum: ['bar', 'pie'],
          default: 'bar',
        },
        data: {
          type: 'array',
          title: 'Дані',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', title: 'Мітка' },
              value: { type: 'number', title: 'Значення' },
              color: { type: 'string', title: 'Колір (hex)' },
            },
            required: ['label', 'value'],
          },
          minItems: 1,
        },
        title: {
          type: 'string',
          title: 'Заголовок',
        },
        showLabels: {
          type: 'boolean',
          title: 'Показувати мітки значень',
          default: true,
        },
      },
      required: ['data'],
    },
    defaultProps: {
      type: 'bar',
      data: [],
      title: '',
      showLabels: true,
    },
  },
];
