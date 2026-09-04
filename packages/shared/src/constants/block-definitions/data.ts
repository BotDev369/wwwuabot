/**
 * DATA — відображення даних
 *
 * Статистика, прогрес, таблиці, рейтинг.
 */

import type { BlockDefinition } from '../../types/page-config';

export const dataBlocks: BlockDefinition[] = [
  {
    type: 'stat',
    label: 'Статистика',
    description: 'Карточка з числом-метрикою та підписом',
    icon: 'bar-chart',
    category: 'data',
    compatibleZones: ['main', 'sidebar', 'header'],
    schema: {
      type: 'object',
      properties: {
        value: {
          type: 'string',
          title: 'Значення',
          description: 'Наприклад: "1,234" або "98%"',
        },
        label: {
          type: 'string',
          title: 'Мітка',
        },
        description: {
          type: 'string',
          title: 'Опис',
        },
        icon: {
          type: 'string',
          title: 'Іконка',
        },
        trend: {
          type: 'string',
          title: 'Тренд',
          enum: ['up', 'down', 'neutral'],
          default: 'neutral',
        },
        trendValue: {
          type: 'string',
          title: 'Значення тренду',
          description: 'Наприклад: "+12%"',
        },
      },
      required: ['value', 'label'],
    },
    defaultProps: {
      value: '0',
      label: '',
      description: '',
      icon: '',
      trend: 'neutral',
      trendValue: '',
    },
  },

  {
    type: 'progress',
    label: 'Прогрес',
    description: 'Індикатор прогресу або рівня заповнення',
    icon: 'bar-chart',
    category: 'data',
    compatibleZones: ['main', 'sidebar'],
    schema: {
      type: 'object',
      properties: {
        value: {
          type: 'number',
          title: 'Поточне значення',
          default: 0,
        },
        max: {
          type: 'number',
          title: 'Максимальне значення',
          default: 100,
        },
        label: {
          type: 'string',
          title: 'Мітка',
        },
        showPercent: {
          type: 'boolean',
          title: 'Показувати %',
          default: true,
        },
        color: {
          type: 'string',
          title: 'Колір',
          enum: ['accent', 'green', 'yellow', 'red'],
          default: 'accent',
        },
      },
      required: ['value'],
    },
    defaultProps: {
      value: 0,
      max: 100,
      label: '',
      showPercent: true,
      color: 'accent',
    },
  },

  {
    type: 'table',
    label: 'Таблиця',
    description: 'Таблиця даних з заголовками',
    icon: 'clipboard',
    category: 'data',
    compatibleZones: ['main'],
    schema: {
      type: 'object',
      properties: {
        headers: {
          type: 'array',
          title: 'Заголовки',
          items: { type: 'string' },
          minItems: 1,
        },
        rows: {
          type: 'array',
          title: 'Рядки',
          items: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        striped: {
          type: 'boolean',
          title: 'Зебра-рядки',
          default: true,
        },
        bordered: {
          type: 'boolean',
          title: 'З рамкою',
          default: true,
        },
      },
      required: ['headers', 'rows'],
    },
    defaultProps: {
      headers: [],
      rows: [],
      striped: true,
      bordered: true,
    },
  },

  {
    type: 'rating',
    label: 'Рейтинг',
    description: 'Відображення рейтингу зірками',
    icon: 'star',
    category: 'data',
    compatibleZones: ['main', 'sidebar'],
    schema: {
      type: 'object',
      properties: {
        value: {
          type: 'number',
          title: 'Рейтинг',
          default: 0,
        },
        max: {
          type: 'number',
          title: 'Максимум',
          default: 5,
        },
        label: {
          type: 'string',
          title: 'Мітка',
        },
        size: {
          type: 'string',
          title: 'Розмір',
          enum: ['sm', 'md', 'lg'],
          default: 'md',
        },
      },
      required: ['value'],
    },
    defaultProps: {
      value: 0,
      max: 5,
      label: '',
      size: 'md',
    },
  },
];
