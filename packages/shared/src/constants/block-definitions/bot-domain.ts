/**
 * BOT-DOMAIN — специфічні для бота блоки
 *
 * Профіль користувача, астрологічна картка дати.
 */

import type { BlockDefinition } from '../../types/page-config';

export const botDomainBlocks: BlockDefinition[] = [
  {
    type: 'user-profile',
    label: 'Профіль',
    description: "Інформація про користувача Telegram (аватар, ім'я, ID)",
    icon: 'user',
    category: 'bot-domain',
    compatibleZones: ['main', 'sidebar'],
    schema: {
      type: 'object',
      properties: {
        showAvatar: {
          type: 'boolean',
          title: 'Показувати аватар',
          default: true,
        },
        showName: {
          type: 'boolean',
          title: "Показувати ім'я",
          default: true,
        },
        showUsername: {
          type: 'boolean',
          title: 'Показувати @username',
          default: true,
          description: 'Показувати @username користувача',
        },
        showId: {
          type: 'boolean',
          title: 'Показувати ID',
          default: false,
        },
        layout: {
          type: 'string',
          title: 'Розташування',
          enum: ['card', 'inline', 'compact'],
          default: 'card',
        },
      },
    },
    defaultProps: {
      showAvatar: true,
      showName: true,
      showUsername: true,
      showId: false,
      layout: 'card',
    },
  },

  {
    type: 'date-card',
    label: 'Дата',
    description: 'Астрологічна картка дати з розрахунками',
    icon: 'calendar',
    category: 'bot-domain',
    compatibleZones: ['main', 'sidebar'],
    schema: {
      type: 'object',
      properties: {
        dateSource: {
          type: 'string',
          title: 'Джерело дати',
          enum: ['user-birthday', 'custom'],
          default: 'user-birthday',
        },
        customDate: {
          type: 'string',
          title: 'Власна дата',
          description: 'Формат: YYYY-MM-DD (якщо вибрано custom)',
        },
        showZodiac: {
          type: 'boolean',
          title: 'Показувати знак зодіаку',
          default: true,
        },
        showElement: {
          type: 'boolean',
          title: 'Показувати стихію',
          default: true,
        },
        showNumerology: {
          type: 'boolean',
          title: 'Показувати нумерологію',
          default: true,
        },
        layout: {
          type: 'string',
          title: 'Розташування',
          enum: ['full', 'compact', 'minimal'],
          default: 'full',
        },
      },
    },
    defaultProps: {
      dateSource: 'user-birthday',
      customDate: '',
      showZodiac: true,
      showElement: true,
      showNumerology: true,
      layout: 'full',
    },
  },
];
