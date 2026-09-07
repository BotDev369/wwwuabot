/**
 * BOT-DOMAIN — специфічні для бота блоки
 *
 * Профіль користувача, астрологічна картка дати,
 * модулі MyDate (таблиця, порівняння, аналіз).
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

  // ── MyDate модулі ─────────────────────────────────────────────

  {
    type: 'my-dates-table',
    label: 'Таблиця дат',
    description: 'Таблиця з CRUD-операціями для управління датами: пошук, фільтри, сортування, масові дії',
    icon: 'my-dates',
    category: 'bot-domain',
    compatibleZones: ['main'],
    schema: {
      type: 'object',
      properties: {
        showSearch: {
          type: 'boolean',
          title: 'Показувати пошук',
          default: true,
        },
        showTypeFilter: {
          type: 'boolean',
          title: 'Показувати фільтр типів',
          default: true,
        },
        showBulkActions: {
          type: 'boolean',
          title: 'Показувати масові дії',
          default: true,
        },
        showCreateButton: {
          type: 'boolean',
          title: 'Показувати кнопку створення',
          default: true,
        },
      },
    },
    defaultProps: {
      showSearch: true,
      showTypeFilter: true,
      showBulkActions: true,
      showCreateButton: true,
    },
  },

  {
    type: 'compare-setup',
    label: 'Введення дат',
    description: 'Форма введення дат для порівняння: додавання, переміщення, видалення',
    icon: 'compare',
    category: 'bot-domain',
    compatibleZones: ['main'],
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          title: 'Заголовок',
          default: 'Співставлення дат',
        },
        description: {
          type: 'string',
          title: 'Опис',
        },
        maxDates: {
          type: 'number',
          title: 'Максимум дат',
          default: 10,
        },
        nextUrl: {
          type: 'string',
          title: 'URL наступного кроку',
          default: '/mydate/compare/systems',
        },
      },
    },
    defaultProps: {
      title: 'Співставлення дат',
      description: 'Вкажіть дати для аналізу. Дати можна переміщати — це визначить порядок відображення в таблиці.',
      maxDates: 10,
      nextUrl: '/mydate/compare/systems',
    },
  },

  {
    type: 'compare-systems',
    label: 'Вибір систем',
    description: 'Вибір систем аналізу та параметрів для порівняння дат',
    icon: 'eye',
    category: 'bot-domain',
    compatibleZones: ['main'],
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          title: 'Заголовок',
          default: 'Оберіть системи та параметри',
        },
        resultUrl: {
          type: 'string',
          title: 'URL результатів',
          default: '/mydate',
        },
        paramKey: {
          type: 'string',
          title: 'Query-параметр для дат',
          default: 'dates',
        },
        systemKey: {
          type: 'string',
          title: 'Query-параметр для систем',
          default: 'sys',
        },
        parameterKey: {
          type: 'string',
          title: 'Query-параметр для параметрів',
          default: 'p',
        },
      },
    },
    defaultProps: {
      title: 'Оберіть системи та параметри',
      resultUrl: '/mydate',
      paramKey: 'dates',
      systemKey: 'sys',
      parameterKey: 'p',
    },
  },

  {
    type: 'compare-table',
    label: 'Таблиця порівняння',
    description: 'Матриця порівняння дат за системами аналізу',
    icon: 'compare',
    category: 'bot-domain',
    compatibleZones: ['main'],
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          title: 'Заголовок',
          default: 'Співставлення дат',
        },
        backUrl: {
          type: 'string',
          title: 'URL назад',
          default: '/mydate/compare',
        },
        paramKey: {
          type: 'string',
          title: 'Query-параметр для дат',
          default: 'dates',
        },
        systemKey: {
          type: 'string',
          title: 'Query-параметр для систем',
          default: 'sys',
        },
        parameterKey: {
          type: 'string',
          title: 'Query-параметр для параметрів',
          default: 'p',
        },
      },
    },
    defaultProps: {
      title: 'Співставлення дат',
      backUrl: '/mydate/compare',
      paramKey: 'dates',
      systemKey: 'sys',
      parameterKey: 'p',
    },
  },

  {
    type: 'date-analysis',
    label: 'Аналіз дати',
    description: 'Аналіз однієї дати з картками систем (нумерологія, астрологія, таро тощо)',
    icon: 'sparkles',
    category: 'bot-domain',
    compatibleZones: ['main'],
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          title: 'Заголовок',
          default: 'Аналіз дати',
        },
        dateSource: {
          type: 'string',
          title: 'Джерело дати',
          enum: ['url', 'custom'],
          default: 'url',
        },
        customDate: {
          type: 'string',
          title: 'Власна дата',
          description: 'Формат: YYYY-MM-DD (якщо вибрано custom)',
        },
        backUrl: {
          type: 'string',
          title: 'URL назад',
          default: '/mydate',
        },
      },
    },
    defaultProps: {
      title: 'Аналіз дати',
      dateSource: 'url',
      customDate: '',
      backUrl: '/mydate',
    },
  },
];
