/**
 * FORMS — форми та введення
 *
 * Інпути, текстові поля, вибір зі списку.
 */

import type { BlockDefinition } from '../../types/page-config';

export const formsBlocks: BlockDefinition[] = [
  {
    type: 'input',
    label: 'Інпут',
    description: 'Поле введення тексту',
    icon: 'edit',
    category: 'forms',
    compatibleZones: ['main'],
    schema: {
      type: 'object',
      properties: {
        label: {
          type: 'string',
          title: 'Мітка',
        },
        placeholder: {
          type: 'string',
          title: 'Placeholder',
        },
        type: {
          type: 'string',
          title: 'Тип',
          enum: ['text', 'email', 'number', 'phone', 'password', 'url'],
          default: 'text',
        },
        required: {
          type: 'boolean',
          title: "Обов'язкове",
          default: false,
        },
        name: {
          type: 'string',
          title: "Ім'я поля",
          description: 'Ключ для збереження даних',
        },
      },
    },
    defaultProps: {
      label: '',
      placeholder: '',
      type: 'text',
      required: false,
      name: '',
    },
  },

  {
    type: 'textarea',
    label: 'Текстове поле',
    description: 'Поле введення багаторядкового тексту',
    icon: 'edit',
    category: 'forms',
    compatibleZones: ['main'],
    schema: {
      type: 'object',
      properties: {
        label: {
          type: 'string',
          title: 'Мітка',
        },
        placeholder: {
          type: 'string',
          title: 'Placeholder',
        },
        rows: {
          type: 'number',
          title: 'Кількість рядків',
          default: 4,
        },
        required: {
          type: 'boolean',
          title: "Обов'язкове",
          default: false,
        },
        name: {
          type: 'string',
          title: "Ім'я поля",
        },
      },
    },
    defaultProps: {
      label: '',
      placeholder: '',
      rows: 4,
      required: false,
      name: '',
    },
  },

  {
    type: 'select',
    label: 'Вибір',
    description: 'Список вибору з декількома опціями',
    icon: 'filter',
    category: 'forms',
    compatibleZones: ['main'],
    schema: {
      type: 'object',
      properties: {
        label: {
          type: 'string',
          title: 'Мітка',
        },
        options: {
          type: 'array',
          title: 'Опції',
          items: {
            type: 'object',
            properties: {
              value: { type: 'string', title: 'Значення' },
              label: { type: 'string', title: 'Відображення' },
            },
            required: ['value', 'label'],
          },
          minItems: 1,
        },
        placeholder: {
          type: 'string',
          title: 'Placeholder',
        },
        required: {
          type: 'boolean',
          title: "Обов'язкове",
          default: false,
        },
        name: {
          type: 'string',
          title: "Ім'я поля",
        },
      },
      required: ['options'],
    },
    defaultProps: {
      label: '',
      options: [],
      placeholder: 'Оберіть...',
      required: false,
      name: '',
    },
  },
];
