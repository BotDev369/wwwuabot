/**
 * Три готові шаблони сторінок — **дані**, а не логіка.
 *
 * Рядок на шаблон: підпис, іконка, поля, які заповнює людина, і каркас, у який
 * вони вписуються. Нічого, крім цієї таблиці, тут немає — типи й довідники
 * (`pageTemplate`, `primaryField`, `pageTitle`) лежать у `templates.ts`.
 *
 * **Чому окремим файлом.** Дописати четвертий шаблон — це рядок у таблиці
 * констант, а не нова гілка в коді, тож ліміт рядків про неї не рахується
 * (`dataOnlyFiles` у `scripts/quality-baseline.mjs`, той самий випадок, що
 * `icons.tsx` і `tables.ts`). Поділ не косметичний: правка каркаса вимагає
 * відтворити якір байт-у-байт, і полотно з трьох шаблонів робить це дорожчим із
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
    hint: "Вітрина: що ви продаєте, за якими умовами й як замовити",
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
];
