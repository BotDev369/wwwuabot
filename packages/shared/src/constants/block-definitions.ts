/**
 * Page Builder — визначення MVP блоків (модулів).
 *
 * Кожен запис описує один тип блоку:
 * - метадані (назва, іконка, сумісні зони)
 * - JSON Schema для валідації props
 * - дефолтні значення props
 *
 * Ці дані використовуються:
 * 1. JSON-редактором у web-admin для генерації форми
 * 2. Валідацією при збереженні page_data
 * 3. UI для вибору типу блоку при додаванні
 *
 * @module packages/shared/src/constants/block-definitions
 */

import type { BlockDefinition } from '../types/page-config';

// ---------------------------------------------------------------------------
// MVP: базовий набір блоків
// ---------------------------------------------------------------------------

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  // --- Текст ---
  {
    type: 'text',
    label: 'Текст',
    description: 'Блок з заголовком та/або текстовим вмістом',
    icon: 'text',
    compatibleZones: ['main', 'sidebar', 'header', 'footer'],
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          title: 'Заголовок',
          description: 'Необов\'язковий заголовок блоку',
        },
        content: {
          type: 'string',
          title: 'Текст',
          description: 'Текстовий вміст (підтримує Markdown)',
        },
        level: {
          type: 'string',
          title: 'Рівень заголовка',
          enum: ['h1', 'h2', 'h3', 'h4', 'body'],
          default: 'body',
        },
        align: {
          type: 'string',
          title: 'Вирівнювання',
          enum: ['left', 'center', 'right'],
          default: 'left',
        },
      },
      required: ['content'],
    },
    defaultProps: {
      title: '',
      content: '',
      level: 'body',
      align: 'left',
    },
  },

  // --- Зображення ---
  {
    type: 'image',
    label: 'Зображення',
    description: 'Фото або графіка з підписом',
    icon: 'image',
    compatibleZones: ['main', 'sidebar', 'header', 'footer'],
    schema: {
      type: 'object',
      properties: {
        src: {
          type: 'string',
          title: 'URL зображення',
          format: 'uri',
        },
        alt: {
          type: 'string',
          title: 'Альтернативний текст',
        },
        caption: {
          type: 'string',
          title: 'Підпис',
        },
        width: {
          type: 'string',
          title: 'Ширина',
          enum: ['full', '3/4', '1/2', '1/3', 'auto'],
          default: 'full',
        },
        rounded: {
          type: 'boolean',
          title: 'Заокруглені кути',
          default: false,
        },
      },
      required: ['src'],
    },
    defaultProps: {
      src: '',
      alt: '',
      caption: '',
      width: 'full',
      rounded: false,
    },
  },

  // --- Кнопки ---
  {
    type: 'buttons',
    label: 'Кнопки',
    description: 'Група кнопок (посилання або дії)',
    icon: 'buttons',
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

  // --- Список ---
  {
    type: 'list',
    label: 'Список',
    description: 'Нумерований або маркірований список елементів',
    icon: 'list',
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

  // --- Розділювач ---
  {
    type: 'divider',
    label: 'Розділювач',
    description: 'Горизонтальна лінія-розділювач',
    icon: 'divider',
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
];

// ---------------------------------------------------------------------------
// Допоміжні функції
// ---------------------------------------------------------------------------

/**
 * Отримати визначення блоку за типом.
 * Повертає undefined якщо тип не знайдено.
 */
export function getBlockDefinition(
  type: string,
): BlockDefinition | undefined {
  return BLOCK_DEFINITIONS.find((def) => def.type === type);
}

/**
 * Отримати всі блоки, сумісні з певною зоною.
 */
export function getBlocksForZone(
  zone: string,
): BlockDefinition[] {
  return BLOCK_DEFINITIONS.filter(
    (def) =>
      def.compatibleZones.length === 0 ||
      def.compatibleZones.includes(zone as never),
  );
}

/**
 * Отримати дефолтні props для типу блоку.
 * Повертає глибоку копію, щоб зміни не впливали на оригінал.
 */
export function getDefaultProps(type: string): Record<string, unknown> {
  const def = getBlockDefinition(type);
  return def ? JSON.parse(JSON.stringify(def.defaultProps)) : {};
}
