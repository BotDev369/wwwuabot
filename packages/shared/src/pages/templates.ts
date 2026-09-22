/**
 * Шаблони сторінок: дві готові форми, у яких людина змінює **лише текст**.
 *
 * **Навіщо шаблон.** Сторінку збирають із блоків (Page Builder), і це
 * редакторська робота: зони, типи блоків, умови показу. Людині, яка хоче
 * «сторінку про себе», цього не треба — їй треба заповнити три поля. Тому
 * структуру задає шаблон (це **дані**), а людина заповнює текстові поля; блоки
 * з порожнім полем на сторінку не потрапляють узагалі.
 *
 * **Два подання одного контенту, і одне з них — похідне.** У сховищі лежить
 * `page_data` (`PageConfig`) — його рендерить `PageRenderer`. Поля форми — це
 * **подання** того самого: `buildPageConfig()` збирає конфігурацію зі значень,
 * `readPageValues()` дістає значення назад. Другого місця, куди їде текст,
 * немає: значення не зберігаються окремо (`AGENTS.md` §7).
 *
 * Звідси два правила, і обидва тримає `pageBlockId()`:
 *
 * 1. **Ідентифікатор блоку — це `шаблон-поле`.** Саме за ним значення
 *    знаходиться назад; блок без такого `id` редакторові не належить.
 * 2. **Порядок полів — це порядок блоків.** Тому шаблон не тримає `order`
 *    окремо: два списки одного порядку розійшлися б першою ж правкою.
 *
 * @module @wwwuabot/shared/pages
 */

import type { BlockZone, PageBlock, PageConfig } from "../types/page-config.types";

/** Ключі шаблонів — закритий список: ним же підписано `scenarios.template_key`. */
export const PAGE_TEMPLATE_KEYS = ["card", "event"] as const;

export type PageTemplateKey = (typeof PAGE_TEMPLATE_KEYS)[number];

/** Типовий шаблон. Ним відкривається створення й читається невідомий ключ. */
export const DEFAULT_PAGE_TEMPLATE: PageTemplateKey = "card";

/** Одне текстове поле шаблону — те, що людина справді заповнює. */
export interface PageField {
  /** Ключ поля: з нього складається `id` блоку (`pageBlockId`). */
  key: string;
  /** Підпис у формі — те саме слово, що заголовок блоку на сторінці. */
  label: string;
  /** `line` — один рядок, `text` — абзаци (переноси зберігаються). */
  kind: "line" | "text";
  /** Стеля довжини: та сама на формі й на сервері. */
  max: number;
  placeholder: string;
  /**
   * Поле, з якого беруть **назву сторінки** (`scenarios.title`).
   *
   * Воно ж обов'язкове: сторінка без назви не має ні рядка в списку, ні
   * заголовка. Одне на шаблон.
   */
  primary?: boolean;
  /** Як поле стає блоком: рівень заголовка й підпис над текстом. */
  block: { level: "h1" | "h2" | "body"; title?: string };
}

/** Готовий шаблон сторінки. */
export interface PageTemplate {
  key: PageTemplateKey;
  /** Підпис у виборі шаблону. */
  label: string;
  /** Чим цей шаблон відрізняється від сусіднього — одним рядком. */
  hint: string;
  /**
   * Ім'я іконки з реєстру (`IconName`).
   *
   * Саме ім'я, а не тип: цей файл читає **сервер** (`api-dev`), а
   * `components/icons.tsx` — JSX, і воркер без `--jsx` його не збирає. Так
   * само влаштовані блоки Page Builder: `BlockDefinition.icon` — рядок, а
   * `<Icon />` його приводить (`AGENTS.md` §5).
   */
  icon: string;
  fields: readonly PageField[];
}

export const PAGE_TEMPLATES: readonly PageTemplate[] = [
  {
    key: "card",
    label: "Візитка",
    hint: "Про себе: ім'я, кілька слів і як із вами зв'язатися",
    icon: "card",
    fields: [
      {
        key: "title",
        label: "Ім'я або назва",
        kind: "line",
        max: 60,
        placeholder: "Як вас звати або як зветься справа",
        primary: true,
        block: { level: "h1" },
      },
      {
        key: "tagline",
        label: "Коротко про себе",
        kind: "line",
        max: 100,
        placeholder: "Одне речення — чим ви займаєтесь",
        block: { level: "body" },
      },
      {
        key: "about",
        label: "Про себе",
        kind: "text",
        max: 1200,
        placeholder: "Кілька абзаців: досвід, проєкти, чим можете допомогти",
        block: { level: "h2", title: "Про себе" },
      },
      {
        key: "contact",
        label: "Як зв'язатися",
        kind: "line",
        max: 140,
        placeholder: "Телефон, пошта, нік або місто",
        block: { level: "h2", title: "Зв'язок" },
      },
    ],
  },
  {
    key: "event",
    label: "Подія",
    hint: "Що, коли, де — і за яких умов берете участь",
    icon: "calendar",
    fields: [
      {
        key: "title",
        label: "Назва події",
        kind: "line",
        max: 80,
        placeholder: "Що саме відбувається",
        primary: true,
        block: { level: "h1" },
      },
      {
        key: "when",
        label: "Коли",
        kind: "line",
        max: 80,
        placeholder: "Дата й час",
        block: { level: "h2", title: "Коли" },
      },
      {
        key: "where",
        label: "Де",
        kind: "line",
        max: 80,
        placeholder: "Місце або посилання",
        block: { level: "h2", title: "Де" },
      },
      {
        key: "about",
        label: "Що буде",
        kind: "text",
        max: 1200,
        placeholder: "Програма, учасники, подробиці",
        block: { level: "h2", title: "Що буде" },
      },
      {
        key: "terms",
        label: "Умови участі",
        kind: "line",
        max: 140,
        placeholder: "Вхід вільний, квиток, реєстрація…",
        block: { level: "h2", title: "Умови" },
      },
    ],
  },
];

/** Значення полів: ключ поля → текст. Порожній рядок — поле не заповнене. */
export type PageFieldValues = Record<string, string>;

export function isPageTemplateKey(value: unknown): value is PageTemplateKey {
  return typeof value === "string" && (PAGE_TEMPLATE_KEYS as readonly string[]).includes(value);
}

/**
 * Шаблон за ключем; невідомий дає типовий.
 *
 * Невідомий ключ не ламає показ (сторінка відкривається), але записати його
 * неможливо — це вже перевірив `validatePageDraft`.
 */
export function pageTemplate(key: unknown): PageTemplate {
  const found = PAGE_TEMPLATES.find((template) => template.key === key);
  return found ?? PAGE_TEMPLATES[0];
}

/** Поле, з якого беруть назву сторінки; його ж вимагає форма. */
export function primaryField(template: PageTemplate): PageField {
  return template.fields.find((field) => field.primary) ?? template.fields[0];
}

/** Ідентифікатор блоку, який відповідає полю: єдиний зв'язок між ними двома. */
export function pageBlockId(template: PageTemplate, key: string): string {
  return `${template.key}-${key}`;
}

const EMPTY_ZONES: Record<BlockZone, PageBlock[]> = {
  sidebar: [],
  header: [],
  main: [],
  footer: [],
};

/**
 * Значення → `page_data`.
 *
 * Блоки ставляться **в порядку полів** і тільки для непорожніх значень:
 * порожнє поле в шаблоні — це «людина ще не написала», а не порожній
 * заголовок на сторінці. Порожні зони лишаються порожніми — сторінка з
 * шаблону займає рівно `main`.
 */
export function buildPageConfig(template: PageTemplate, values: PageFieldValues): PageConfig {
  const main: PageBlock[] = [];
  for (const field of template.fields) {
    const value = (values[field.key] ?? "").trim();
    if (!value) continue;
    main.push({
      id: pageBlockId(template, field.key),
      type: "text",
      order: main.length,
      props: {
        title: field.block.title ?? "",
        content: value,
        level: field.block.level,
        align: "left",
      },
    });
  }

  return { version: 1, zones: { ...EMPTY_ZONES, main }, visibleZones: ["main"] };
}

/**
 * `page_data` → значення (назад).
 *
 * Читаються лише блоки, чиї `id` належать цьому шаблону: сторінка могла
 * пожити в редакторі блоків, і зайвий блок не має стати полем форми.
 */
export function readPageValues(template: PageTemplate, config: PageConfig | null): PageFieldValues {
  const values: PageFieldValues = {};
  if (!config) return values;

  const known = new Set(template.fields.map((field) => field.key));
  const prefix = `${template.key}-`;
  for (const block of config.zones.main) {
    if (typeof block.id !== "string" || !block.id.startsWith(prefix)) continue;
    const key = block.id.slice(prefix.length);
    if (!known.has(key)) continue;
    const content = (block.props as Record<string, unknown> | undefined)?.content;
    if (typeof content === "string") values[key] = content;
  }
  return values;
}

/**
 * Назва сторінки зі значень — вона ж підпис у списку й заголовок у боті.
 *
 * Тримається тут, а не «де треба»: те саме слово бачать список, сторінка,
 * посилання й бот, і друга функція «як зветься сторінка» розійшлася б із
 * першою (AGENTS.md §7).
 */
export function pageTitle(template: PageTemplate, values: PageFieldValues): string {
  return (values[primaryField(template).key] ?? "").trim();
}
