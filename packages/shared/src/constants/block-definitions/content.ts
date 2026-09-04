/**
 * CONTENT — базові блоки контенту
 *
 * Текст, зображення, richtext, відео, галерея, цитата, код, бейджі.
 */

import type { BlockDefinition } from '../../types/page-config';

export const contentBlocks: BlockDefinition[] = [
  {
    type: 'text',
    label: 'Текст',
    description: 'Блок з заголовком та/або текстовим вмістом',
    icon: 'text',
    category: 'content',
    compatibleZones: ['main', 'sidebar', 'header', 'footer'],
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          title: 'Заголовок',
          description: "Необов'язковий заголовок блоку",
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

  {
    type: 'image',
    label: 'Зображення',
    description: 'Фото або графіка з підписом',
    icon: 'image',
    category: 'content',
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

  {
    type: 'richtext',
    label: 'Rich Text',
    description: 'Текст з форматуванням: жирний, курсив, посилання, код',
    icon: 'edit',
    category: 'content',
    compatibleZones: ['main', 'sidebar'],
    schema: {
      type: 'object',
      properties: {
        html: {
          type: 'string',
          title: 'HTML-вміст',
          description: 'Підтримує <b>, <i>, <a>, <code>, <ul>, <ol>, <li>, <p>',
        },
      },
      required: ['html'],
    },
    defaultProps: {
      html: '',
    },
  },

  {
    type: 'video',
    label: 'Відео',
    description: 'Відео-плеєр (YouTube, Vimeo або прямий URL)',
    icon: 'video',
    category: 'content',
    compatibleZones: ['main'],
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          title: 'URL відео',
          description: 'YouTube, Vimeo або прямий .mp4/.webm',
        },
        title: {
          type: 'string',
          title: 'Заголовок',
        },
        caption: {
          type: 'string',
          title: 'Підпис',
        },
        autoplay: {
          type: 'boolean',
          title: 'Автозапуск',
          default: false,
        },
        loop: {
          type: 'boolean',
          title: 'Зациклення',
          default: false,
        },
      },
      required: ['url'],
    },
    defaultProps: {
      url: '',
      title: '',
      caption: '',
      autoplay: false,
      loop: false,
    },
  },

  {
    type: 'gallery',
    label: 'Галерея',
    description: 'Сітка зображень з можливістю перегляду',
    icon: 'grid',
    category: 'content',
    compatibleZones: ['main'],
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          title: 'Зображення',
          items: {
            type: 'object',
            properties: {
              src: { type: 'string', title: 'URL', format: 'uri' },
              alt: { type: 'string', title: 'Альтернативний текст' },
              caption: { type: 'string', title: 'Підпис' },
            },
            required: ['src'],
          },
          minItems: 1,
        },
        columns: {
          type: 'string',
          title: 'Кількість стовпців',
          enum: ['2', '3', '4'],
          default: '2',
        },
        rounded: {
          type: 'boolean',
          title: 'Заокруглені кути',
          default: true,
        },
        gap: {
          type: 'string',
          title: 'Відстань між елементами',
          enum: ['sm', 'md', 'lg'],
          default: 'md',
        },
      },
      required: ['images'],
    },
    defaultProps: {
      images: [],
      columns: '2',
      rounded: true,
      gap: 'md',
    },
  },

  {
    type: 'quote',
    label: 'Цитата',
    description: 'Блок-цитата з атрибуцією',
    icon: 'quote',
    category: 'content',
    compatibleZones: ['main', 'sidebar'],
    schema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          title: 'Текст цитати',
        },
        author: {
          type: 'string',
          title: 'Автор',
        },
        role: {
          type: 'string',
          title: 'Посада / опис автора',
        },
        style: {
          type: 'string',
          title: 'Стиль',
          enum: ['border-left', 'border-right', 'filled', 'outlined'],
          default: 'border-left',
        },
      },
      required: ['text'],
    },
    defaultProps: {
      text: '',
      author: '',
      role: '',
      style: 'border-left',
    },
  },

  {
    type: 'code',
    label: 'Код',
    description: 'Блок коду з підсвіткою синтаксису',
    icon: 'code',
    category: 'content',
    compatibleZones: ['main', 'sidebar'],
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          title: 'Код',
        },
        language: {
          type: 'string',
          title: 'Мова',
          enum: ['javascript', 'typescript', 'python', 'html', 'css', 'json', 'bash', 'sql', 'plain'],
          default: 'plain',
        },
        title: {
          type: 'string',
          title: 'Заголовок',
        },
        showLineNumbers: {
          type: 'boolean',
          title: 'Показувати номери рядків',
          default: false,
        },
        copyable: {
          type: 'boolean',
          title: 'Кнопка копіювання',
          default: true,
        },
      },
      required: ['code'],
    },
    defaultProps: {
      code: '',
      language: 'plain',
      title: '',
      showLineNumbers: false,
      copyable: true,
    },
  },

  {
    type: 'badge',
    label: 'Бейдж',
    description: 'Смуга бейджів/міток для статусів та тегів',
    icon: 'tag',
    category: 'content',
    compatibleZones: ['main', 'header', 'sidebar'],
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          title: 'Бейджі',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string', title: 'Текст' },
              variant: {
                type: 'string',
                title: 'Стиль',
                enum: ['accent', 'green', 'red', 'yellow', 'neutral'],
                default: 'accent',
              },
            },
            required: ['text'],
          },
          minItems: 1,
        },
        layout: {
          type: 'string',
          title: 'Розташування',
          enum: ['row', 'wrap'],
          default: 'wrap',
        },
      },
      required: ['items'],
    },
    defaultProps: {
      items: [],
      layout: 'wrap',
    },
  },
];
