/**
 * Шаблони сторінок: дві **готові сторінки**, у яких людина змінює лише текст.
 *
 * **Навіщо шаблон.** Сторінку збирають із блоків (Page Builder), і це
 * редакторська робота: зони, типи блоків, умови показу. Людині, яка хоче
 * «сторінку про себе», цього не треба — їй треба вписати ім'я, кілька речень і
 * контакт. Тому **сторінку збирає шаблон** (це **дані**), а людина заповнює
 * текстові поля.
 *
 * **Шаблон — це не список полів, а каркас із блоків.** Тут лежить готовий
 * `layout`: картки, рівні заголовків, розділювач — усе те, що робить зі
 * сторінки сторінку. Поля лише **вписуються** в нього: у каркасі на місці
 * тексту стоїть плейсхолдер `{{ключ}}`. Звідси дві речі, заради яких усе й
 * зроблено так:
 *
 * 1. **Порожнього не видно.** Блок, який мав текст і не отримав його, на
 *    сторінку не потрапляє разом із підписом, карткою й лінією навколо нього.
 *    Тож «візитка з самого імені» — повноцінна сторінка, а не набір порожніх
 *    прямокутників.
 * 2. **Другого місця, куди їде текст, немає.** У сховищі лежить `page_data`
 *    (`PageConfig`) — його рендерить `PageRenderer`, і з нього ж значення
 *    читаються назад. Поля — це **подання** того самого, а не друга копія
 *    (`AGENTS.md` §7).
 *
 * Сам переклад у `page_data` і назад — у `page-data.ts`: `buildPageConfig`,
 * `readPageValues` і `fieldPlacements`. Тут лише дані й довідники до них, бо
 * розійтись ці два напрямки могли б тихо (тоді форма показувала б не те, що на
 * сторінці), і тримати їх поруч дешевше, ніж ловити очима.
 *
 * **Плейсхолдер займає prop цілком** (`title: "{{title}}"`), а не стоїть
 * посеред тексту. Це не примха: інакше читання назад не змогло б сказати, де в
 * написаному рядку закінчується текст людини й починається текст шаблону, і
 * примірник замість назви показав би «Ваше ім'я · Київ» одним полем. Стереже це
 * `templates.test.ts`.
 *
 * @module @wwwuabot/shared/pages
 */

/** Ключі шаблонів — закритий список: ним же підписано `scenarios.template_key`. */
export const PAGE_TEMPLATE_KEYS = ["card", "event"] as const;

export type PageTemplateKey = (typeof PAGE_TEMPLATE_KEYS)[number];

/** Типовий шаблон. Ним відкривається створення й читається невідомий ключ. */
export const DEFAULT_PAGE_TEMPLATE: PageTemplateKey = "card";

/**
 * Як значення поля показати **в редакторі**.
 *
 * На сторінці його малює блок (каркас), а в редакторі текст стоїть полем вводу —
 * і мусить виглядати там так само, як стоятиме на сторінці: інакше людина
 * вирівнює не те, що побачить. Класи цих трьох щаблів бере
 * `PageEditorField` зі спільного `TEXT_LEVEL_CLASSES`.
 *
 * `display` — назва сторінки, `lead` — рядок під нею (дата, один рядок про
 * себе), `body` — текст розділу.
 */
export type PageFieldLook = "display" | "lead" | "body";

/** Одне текстове поле шаблону — те, що людина справді заповнює. */
export interface PageField {
  /** Ключ поля: ним воно називається в каркасі (`{{ключ}}`) і у формі. */
  key: string;
  /** Підпис у формі — те, що людина бачить над полем. */
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
  /** Як значення виглядає на сторінці — і, отже, у редакторі. */
  look: PageFieldLook;
  /**
   * Підпис розділу, під яким значення стоїть на сторінці («Про себе», «Де»).
   *
   * Це **структура** шаблону, і вона ж стає підписом у редакторі: людина править
   * текст під тим самим словом, під яким його прочитають. Порожньо — значення
   * стоїть без підпису (назва сторінки, рядок про себе).
   */
  section?: string;
}

/**
 * Блок каркаса: те, з чого складено сторінку.
 *
 * `id` — місцевий, у межах шаблону; назовні блок зветься `шаблон-id`
 * (`pageBlockId`), бо `page_data` — це плоский список зон, і два шаблони в
 * одній таблиці не мають права зійтись ідентифікаторами.
 */
export interface PageBlockSpec {
  id: string;
  /** Тип із реєстру блоків (`@wwwuabot/ui/blocks`). */
  type: string;
  /** Props блока; у рядкових — плейсхолдери `{{ключ}}` замість тексту. */
  props: Record<string, unknown>;
  /** Вкладені блоки (картка тримає свій текст усередині). */
  children?: readonly PageBlockSpec[];
}

/** Готовий шаблон сторінки. */
export interface PageTemplate {
  key: PageTemplateKey;
  /** Підпис у виборі шаблону. */
  label: string;
  /** Чим цей шаблон відрізняється від сусіднього — одним рядком. */
  hint: string;
  /**
   * Текст-приклад — те, чим шаблон **показують** перед вибором.
   *
   * Шаблон обирають очима: людина мусить побачити готову сторінку **до** того,
   * як візьме шаблон, а порожні поля цього не показують. Тому приклад лежить у
   * **даних шаблону**, а не в розмітці екрана: третій шаблон інакше отримав би
   * перегляд без тексту, і про це не сказав би ні компілятор, ні око (стереже
   * `templates.test.ts`).
   *
   * Значення — ті самі, що заповнює людина: перегляд складають
   * `buildPageConfig(template, template.preview)`, тож він не може розійтися з
   * тим, що шаблон робить насправді.
   */
  preview: PageFieldValues;
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
  /** Каркас сторінки: блоки, у яких стоять плейсхолдери полів. */
  layout: readonly PageBlockSpec[];
}

/**
 * Картки, а не суцільний текст, і це головне в цих двох шаблонах.
 *
 * «Сторінка» з п'яти абзаців на тлі — це не сторінка: її нічим не видно, у ній
 * немає ні межі, ні розділів, і на телефоні вона читається як порожній екран із
 * кількома рядками посередині. Каркас тому складається з **картки-заголовка**
 * (назва найбільшим щаблем і рядок під нею), карток-розділів (підпис у
 * заголовку картки, текст усередині) і **лінії** між заголовком і рештою.
 *
 * Порожній розділ не лишає по собі ні картки, ні порожнього підпису: блок, який
 * не отримав тексту, на сторінку не потрапляє взагалі (`buildPageConfig`).
 */
export const PAGE_TEMPLATES: readonly PageTemplate[] = [
  {
    key: "card",
    label: "Візитка",
    hint: "Про себе: ім'я, кілька слів і як із вами зв'язатися",
    icon: "card",
    preview: {
      title: "Олена Ткаченко",
      tagline: "Ілюстраторка, малюю дитячі книжки",
      about:
        "Дванадцять років працюю з видавництвами: обкладинки, розгортки, персонажі.\n" +
        "Веду майстерню для тих, хто тільки починає.",
      contact: "Київ · +380 67 000 00 00",
    },
    fields: [
      {
        key: "title",
        label: "Ім'я або назва",
        kind: "line",
        max: 60,
        placeholder: "Як вас звати або як зветься справа",
        primary: true,
        look: "display",
      },
      {
        key: "tagline",
        label: "Коротко про себе",
        kind: "line",
        max: 100,
        placeholder: "Одне речення — чим ви займаєтесь",
        look: "lead",
      },
      {
        key: "about",
        label: "Про себе",
        kind: "text",
        max: 1200,
        placeholder: "Кілька абзаців: досвід, проєкти, чим можете допомогти",
        look: "body",
        section: "Про себе",
      },
      {
        key: "contact",
        label: "Як зв'язатися",
        kind: "line",
        max: 140,
        placeholder: "Телефон, пошта, нік або місто",
        look: "body",
        section: "Зв'язок",
      },
    ],
    layout: [
      {
        // Заголовок сторінки: картка з підняттям, бо це єдине місце, де видно
        // **ім'я** — а його читають першим.
        id: "head",
        type: "card",
        props: { padding: "lg", elevated: true },
        children: [
          { id: "head-title", type: "text", props: { title: "{{title}}", level: "h1" } },
          // Рядок про себе — щаблем нижче за ім'я: це той самий `lead`, яким
          // поле показано в редакторі.
          { id: "head-tagline", type: "text", props: { title: "{{tagline}}", level: "h3" } },
        ],
      },
      {
        id: "about",
        type: "card",
        props: { title: "Про себе" },
        children: [{ id: "about-text", type: "text", props: { content: "{{about}}" } }],
      },
      { id: "divider", type: "divider", props: { style: "gradient", spacing: "sm" } },
      {
        id: "contact",
        type: "card",
        props: { title: "Зв'язок" },
        children: [{ id: "contact-text", type: "text", props: { content: "{{contact}}" } }],
      },
    ],
  },
  {
    key: "event",
    label: "Подія",
    hint: "Що, коли, де — і за яких умов берете участь",
    icon: "calendar",
    preview: {
      title: "Лекція «Місто і мова»",
      when: "12 жовтня, 18:30",
      where: "Київ, Хрещатик 1 — і в Zoom",
      about: "Розбираємо, як місто змінює мову людей, і звідки беруться місцеві назви.",
      terms: "Вхід вільний, потрібна реєстрація",
    },
    fields: [
      {
        key: "title",
        label: "Назва події",
        kind: "line",
        max: 80,
        placeholder: "Що саме відбувається",
        primary: true,
        look: "display",
      },
      {
        key: "when",
        label: "Коли",
        kind: "line",
        max: 80,
        placeholder: "Дата й час",
        look: "lead",
      },
      {
        key: "where",
        label: "Де",
        kind: "line",
        max: 80,
        placeholder: "Місце або посилання",
        look: "body",
        section: "Де",
      },
      {
        key: "about",
        label: "Що буде",
        kind: "text",
        max: 1200,
        placeholder: "Програма, учасники, подробиці",
        look: "body",
        section: "Що буде",
      },
      {
        key: "terms",
        label: "Умови участі",
        kind: "line",
        max: 140,
        placeholder: "Вхід вільний, квиток, реєстрація…",
        look: "body",
        section: "Умови",
      },
    ],
    layout: [
      {
        id: "head",
        type: "card",
        props: { padding: "lg", elevated: true },
        children: [
          { id: "head-title", type: "text", props: { title: "{{title}}", level: "h1" } },
          // Дата — окремим щаблем, а не приглушеним тілом: у події «коли» — це
          // перше, що шукають очима.
          { id: "head-when", type: "text", props: { title: "{{when}}", level: "h3" } },
        ],
      },
      {
        id: "where",
        type: "card",
        props: { title: "Де" },
        children: [{ id: "where-text", type: "text", props: { content: "{{where}}" } }],
      },
      { id: "divider", type: "divider", props: { style: "gradient", spacing: "sm" } },
      {
        id: "about",
        type: "card",
        props: { title: "Що буде" },
        children: [{ id: "about-text", type: "text", props: { content: "{{about}}" } }],
      },
      {
        id: "terms",
        type: "card",
        props: { title: "Умови" },
        children: [{ id: "terms-text", type: "text", props: { content: "{{terms}}" } }],
      },
    ],
  },
];

/** Значення полів: ключ поля → текст. Порожній рядок — поле не заповнене. */
export type PageFieldValues = Record<string, string>;

/** Де саме на сторінці лежить значення поля. */
export interface PageFieldPlacement {
  /** `id` блока в `page_data` (уже з ключем шаблону). */
  blockId: string;
  /** Prop блока, у який поїхало значення. */
  prop: string;
}

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

/** Ідентифікатор блока в `page_data`: `шаблон-id` із каркаса. */
export function pageBlockId(template: PageTemplate, id: string): string {
  return `${template.key}-${id}`;
}

/**
 * Назва сторінки зі значень — вона ж підпис у списку й заголовок у боті.
 *
 * Тримається тут, а не «де треба»: те саме слово бачать список, сторінка,
 * посилання й бот, і друга функція «як зветься сторінка» розійшлася б із
 * першою (`AGENTS.md` §7).
 */
export function pageTitle(template: PageTemplate, values: PageFieldValues): string {
  return (values[primaryField(template).key] ?? "").trim();
}
