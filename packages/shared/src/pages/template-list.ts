/**
 * Готові шаблони сторінок — **дані**, а не логіка.
 *
 * Рядок на шаблон: підпис, іконка, поля, які заповнює людина, і каркас, у який
 * вони вписуються. Нічого, крім цієї таблиці, тут немає — типи й довідники
 * (`pageTemplate`, `primaryField`, `pageTitle`) лежать у `templates.ts`.
 *
 * **Чому окремим файлом.** Дописати четвертий шаблон — це рядок у таблиці
 * констант, а не нова гілка в коді, тож ліміт рядків про неї не рахується
 * (`dataOnlyFiles` у `scripts/quality-baseline.mjs`, той самий випадок, що
 * `icons.tsx` і `tables.ts`). Поділ не косметичний: правка каркаса вимагає
 * відтворити якір байт-у-байт, і полотно з чотирьох шаблонів робить це дорожчим із
 * кожним наступним (`docs/README.md`, бюджет розміру).
 *
 * Каркас лишається **даними шаблону**, а не розміткою екрана: перегляд
 * складають `buildPageConfig(template, template.preview)`, і третій шаблон
 * інакше отримав би показ без тексту, про що не сказав би ні компілятор, ні око
 * (`templates.test.ts`).
 *
 * @module @wwwuabot/shared/pages
 */

import type { PageTemplate } from "./templates";

/**
 * Картки, а не суцільний текст, і це головне в цих шаблонах.
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
  {
    key: "shop",
    label: "Магазин",
    hint: "Вітрина й товари: що ви продаєте, за якими умовами й як замовити",
    icon: "shop",
    preview: {
      title: "Кава на розі",
      tagline: "Смажимо зерно щочетверга й відправляємо по всій країні",
      about:
        "Мініобсмажувальня на Подолі: беремо зерно напряму в трьох фермерів,\n" +
        "обсмажуємо невеликими партіями й віддаємо того ж тижня.",
      terms: "Відправлення 1–2 дні, оплата на картку, \nсамовивіз із майстерні — безкоштовний.",
      contact: "Київ, вул. Верхній Вал 10 · +380 67 000 00 00",
    },
    fields: [
      {
        key: "title",
        label: "Назва магазину",
        kind: "line",
        max: 60,
        placeholder: "Як зветься ваша справа",
        primary: true,
        look: "display",
      },
      {
        key: "tagline",
        label: "Коротко про магазин",
        kind: "line",
        max: 100,
        placeholder: "Одне речення — що ви продаєте",
        look: "lead",
      },
      {
        key: "about",
        label: "Про магазин",
        kind: "text",
        max: 1200,
        placeholder: "Кілька абзаців: що це, звідки й чим відрізняється від інших",
        look: "body",
        section: "Про магазин",
      },
      {
        // Умови стоять окремою карткою, а не в «Про магазин»: людина шукає їх
        // очима, коли вже вирішила купити, і не має читати для цього все.
        key: "terms",
        label: "Доставка й оплата",
        kind: "text",
        max: 600,
        placeholder: "Скільки чекати, як платити, чи є самовивіз",
        look: "body",
        section: "Доставка й оплата",
      },
      {
        key: "contact",
        label: "Як замовити й зв'язатися",
        kind: "line",
        max: 140,
        placeholder: "Телефон, адреса, години роботи",
        look: "body",
        section: "Замовлення",
      },
    ],
    layout: [
      {
        id: "head",
        type: "card",
        props: { padding: "lg", elevated: true },
        children: [
          { id: "head-title", type: "text", props: { title: "{{title}}", level: "h1" } },
          { id: "head-tagline", type: "text", props: { title: "{{tagline}}", level: "h3" } },
        ],
      },
      // Товари — **другим екраном, а не останнім**: у магазині спершу дивляться
      // на товар і лише потім читають умови. Сітку малює блок `shop-grid`,
      // який бере картки з контексту (вони лежать у таблиці, не в `page_data`) —
      // саме тому магазин і не виглядає парою текстових блоків.
      { id: "grid", type: "shop-grid", props: { title: "Товари" } },
      {
        id: "about",
        type: "card",
        props: { title: "Про магазин" },
        children: [{ id: "about-text", type: "text", props: { content: "{{about}}" } }],
      },
      { id: "divider", type: "divider", props: { style: "gradient", spacing: "sm" } },
      {
        id: "terms",
        type: "card",
        props: { title: "Доставка й оплата" },
        children: [{ id: "terms-text", type: "text", props: { content: "{{terms}}" } }],
      },
      {
        id: "contact",
        type: "card",
        props: { title: "Замовлення" },
        children: [{ id: "contact-text", type: "text", props: { content: "{{contact}}" } }],
      },
    ],
  },
  {
    key: "article",
    label: "Стаття",
    hint: "Контентна сторінка: рубрика, заголовок, лід, текст, цитата й джерела",
    icon: "page",
    preview: {
      kicker: "Есе · Мова",
      title: "Місто, яке говорить",
      lead:
        "Як вулиця змінює словник, а словник — вулицю: три історії про назви,\n" +
        "які пережили своїх авторів.",
      body:
        "Перше, що чує людина в новому місті, — не архітектура, а назви. Вони\n" +
        "випереджають пам'ятники й сперечаються з картою: площа зветься так,\n" +
        "як уже ніхто не каже, а провулок — на честь людини, якої ніхто не\n" +
        "пам'ятає.\n\nНазва живе довше за об'єкт. Вулицю перейменували тричі,\n" +
        "але старожили досі кажуть «на стару пошту» — і їх розуміють.",
      quote: "Назва не описує місце. Вона його продовжує.",
      sources:
        "Польський, М. «Топоніміка Києва». Київ: Дух і літера, 2019.\n" +
        "Інтерв'ю з мешканцями Подолу, жовтень 2026.",
    },
    fields: [
      {
        key: "kicker",
        label: "Рубрика",
        kind: "line",
        max: 48,
        placeholder: "Есе, репортаж, розбір — одним словом",
        look: "lead",
      },
      {
        key: "title",
        label: "Заголовок",
        kind: "line",
        max: 90,
        placeholder: "Про що ця сторінка",
        primary: true,
        look: "display",
      },
      {
        key: "lead",
        label: "Лід",
        kind: "text",
        max: 400,
        placeholder: "Два-три речення, які тримають увагу",
        look: "lead",
      },
      {
        key: "body",
        label: "Текст",
        kind: "text",
        max: 4000,
        placeholder: "Абзаци. Порожній рядок — новий абзац",
        look: "body",
        section: "Текст",
      },
      {
        key: "quote",
        label: "Цитата",
        kind: "text",
        max: 400,
        placeholder: "Одна фраза, яку хочеться винести з тексту",
        look: "body",
        section: "Цитата",
      },
      {
        key: "sources",
        label: "Джерела",
        kind: "text",
        max: 800,
        placeholder: "Звідки взяті факти й цифри",
        look: "body",
        section: "Джерела",
      },
    ],
    layout: [
      {
        // Шапка статті — три щаблі в одній картці: рубрика, заголовок, лід.
        // Разом вони читаються як обкладинка, окремо — як три різні блоки.
        id: "head",
        type: "card",
        props: { padding: "lg", elevated: true },
        children: [
          { id: "head-kicker", type: "text", props: { title: "{{kicker}}", level: "h4" } },
          { id: "head-title", type: "text", props: { title: "{{title}}", level: "h1" } },
          { id: "head-lead", type: "text", props: { title: "{{lead}}", level: "h3" } },
        ],
      },
      { id: "divider", type: "divider", props: { style: "gradient", spacing: "sm" } },
      {
        id: "body",
        type: "card",
        props: { padding: "md" },
        children: [{ id: "body-text", type: "text", props: { content: "{{body}}" } }],
      },
      // Цитата стоїть **поміж** текстом і джерелами: винесена фраза — це
      // пауза в читанні, а не примітка в кінці.
      { id: "quote", type: "quote", props: { text: "{{quote}}" } },
      {
        id: "sources",
        type: "card",
        props: { title: "Джерела" },
        children: [{ id: "sources-text", type: "text", props: { content: "{{sources}}" } }],
      },
    ],
  },
];
