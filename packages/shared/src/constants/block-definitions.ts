/**
 * Page Builder — визначення всіх блоків (модулів) галереї.
 *
 * Кожен запис описує один тип блоку:
 * - метадані (назва, іконка, категорія, сумісні зони)
 * - JSON Schema для валідації props
 * - дефолтні значення props
 *
 * Ці дані використовуються:
 * 1. Галереєю модулів у web-admin (категоризований вибір)
 * 2. JSON-редактором у web-admin для генерації форми
 * 3. Валідацією при збереженні page_data
 * 4. UI для вибору типу блоку при додаванні
 *
 * @module packages/shared/src/constants/block-definitions
 */

import type { BlockDefinition } from '../types/page-config';

// ---------------------------------------------------------------------------
// Повний реєстр блоків — 29 типів, 9 категорій
// ---------------------------------------------------------------------------

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 📝 CONTENT — базові блоки контенту
  // ═══════════════════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════════════════
  // 📐 LAYOUT — структурні блоки
  // ═══════════════════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════════════════
  // 🧭 NAVIGATION — навігація та взаємодія
  // ═══════════════════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 DATA — відображення даних
  // ═══════════════════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════════════════
  // 💰 COMMERCE — комерційні блоки
  // ═══════════════════════════════════════════════════════════════════════════

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
    description: 'Часто задавані питання ( акордеон)',
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

  // ═══════════════════════════════════════════════════════════════════════════
  // 📝 FORMS — форми та введення
  // ═══════════════════════════════════════════════════════════════════════════

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
          title: 'Ім\'я поля',
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
          title: 'Ім\'я поля',
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
          title: 'Ім\'я поля',
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

  // ═══════════════════════════════════════════════════════════════════════════
  // 🤖 BOT-DOMAIN — специфічні для бота блоки
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'user-profile',
    label: 'Профіль',
    description: 'Інформація про користувача Telegram (аватар, ім\'я, ID)',
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
          title: 'Показувати ім\'я',
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

  // ═══════════════════════════════════════════════════════════════════════════
  // 📈 ANALYTICS — аналітичні блоки
  // ═══════════════════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔧 RAW — необроблений вміст
  // ═══════════════════════════════════════════════════════════════════════════

  {
    type: 'html',
    label: 'HTML',
    description: 'Необроблений HTML-код (тільки для адміністраторів)',
    icon: 'code',
    category: 'raw',
    compatibleZones: ['main', 'sidebar', 'header', 'footer'],
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          title: 'HTML-код',
        },
        sandbox: {
          type: 'boolean',
          title: 'Пісочниця (обмежений CSS)',
          default: true,
        },
      },
      required: ['code'],
    },
    defaultProps: {
      code: '<div class="wb-empty">HTML-вміст</div>',
      sandbox: true,
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
 * Отримати блоки за категорією.
 */
export function getBlocksByCategory(
  category: string,
): BlockDefinition[] {
  return BLOCK_DEFINITIONS.filter((def) => def.category === category);
}

/**
 * Отримати всі унікальні категорії.
 */
export function getAllCategories(): string[] {
  const cats = new Set(BLOCK_DEFINITIONS.map((def) => def.category));
  return Array.from(cats);
}

/**
 * Отримати дефолтні props для типу блоку.
 * Повертає глибоку копію, щоб зміни не впливали на оригінал.
 */
export function getDefaultProps(type: string): Record<string, unknown> {
  const def = getBlockDefinition(type);
  return def ? JSON.parse(JSON.stringify(def.defaultProps)) : {};
}
