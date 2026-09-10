/**
 * Sites — вбудовані шаблони.
 *
 * Містить system-шаблони для швидкого створення сайтів та сторінок.
 *
 * @module packages/shared/src/constants/site-templates
 */

import type { Template, SiteTemplateConfig, PageTemplateConfig } from "../types/site.types";
import { DEFAULT_SITE_SETTINGS } from "./site-defaults";

// ── Helper ───────────────────────────────────────────────────

/** Створює шаблон з ID. */
function template(
  id: string,
  name: string,
  description: string,
  type: "site" | "page",
  config: SiteTemplateConfig | PageTemplateConfig,
  tags: string[] = [],
): Template {
  return {
    id,
    name,
    description,
    type,
    config,
    isSystem: true,
    tags,
    createdAt: "2026-09-10T00:00:00Z",
  };
}

// ── Page Templates ───────────────────────────────────────────

const blankPage: PageTemplateConfig = {
  pageData: {
    version: 1,
    zones: {
      sidebar: [],
      header: [],
      main: [
        {
          id: "blank-hero",
          type: "text",
          order: 0,
          props: {
            title: "",
            content: "",
            level: "h1",
            align: "center",
          },
        },
      ],
      footer: [],
    },
    visibleZones: ["main"],
  },
};

const landingPage: PageTemplateConfig = {
  pageData: {
    version: 1,
    zones: {
      sidebar: [],
      header: [],
      main: [
        {
          id: "landing-hero",
          type: "hero",
          order: 0,
          props: {
            title: "Ваш заголовок",
            subtitle: "Опис вашої пропозиції",
            backgroundImage: "",
            buttons: [
              { text: "Дізнатися більше", url: "#features", variant: "primary" },
            ],
            align: "center",
          },
        },
        {
          id: "landing-divider-1",
          type: "divider",
          order: 1,
          props: { style: "gradient", spacing: "lg" },
        },
        {
          id: "landing-features",
          type: "feature-card",
          order: 2,
          props: {
            items: [
              { icon: "star", title: "Перевага 1", description: "Опис першої переваги" },
              { icon: "heart", title: "Перевага 2", description: "Опис другої переваги" },
              { icon: "bookmark", title: "Перевага 3", description: "Опис третьої переваги" },
            ],
            columns: "3",
          },
        },
        {
          id: "landing-divider-2",
          type: "divider",
          order: 3,
          props: { style: "gradient", spacing: "lg" },
        },
        {
          id: "landing-cta",
          type: "link-button",
          order: 4,
          props: {
            text: "Почати зараз",
            url: "#",
            target: "_blank",
            variant: "primary",
            size: "lg",
            align: "center",
          },
        },
      ],
      footer: [],
    },
    visibleZones: ["main"],
  },
};

const businessCardPage: PageTemplateConfig = {
  pageData: {
    version: 1,
    zones: {
      sidebar: [],
      header: [],
      main: [
        {
          id: "card-hero",
          type: "hero",
          order: 0,
          props: {
            title: "Ваше Ім'я",
            subtitle: "Посада або опис",
            backgroundImage: "",
            buttons: [],
            align: "center",
          },
        },
        {
          id: "card-contacts",
          type: "text",
          order: 1,
          props: {
            title: "Контакти",
            content: "Email: example@email.com\nТелефон: +380 XX XXX XX XX\nTelegram: @username",
            level: "body",
            align: "center",
          },
        },
        {
          id: "card-links",
          type: "buttons",
          order: 2,
          props: {
            buttons: [
              { text: "Telegram", url: "https://t.me/username", variant: "primary" },
              { text: "Website", url: "https://example.com", variant: "secondary" },
            ],
            layout: "row",
            align: "center",
          },
        },
      ],
      footer: [],
    },
    visibleZones: ["main"],
  },
};

const eventPage: PageTemplateConfig = {
  pageData: {
    version: 1,
    zones: {
      sidebar: [],
      header: [],
      main: [
        {
          id: "event-hero",
          type: "hero",
          order: 0,
          props: {
            title: "Назва Події",
            subtitle: "Короткий опис події",
            backgroundImage: "",
            buttons: [],
            align: "center",
          },
        },
        {
          id: "event-date",
          type: "stat",
          order: 1,
          props: {
            label: "Дата",
            value: "01.01.2026",
            icon: "calendar",
          },
        },
        {
          id: "event-desc",
          type: "text",
          order: 2,
          props: {
            title: "Про подію",
            content: "Детальний опис вашої події...",
            level: "body",
            align: "left",
          },
        },
        {
          id: "event-faq",
          type: "faq",
          order: 3,
          props: {
            title: "Часті питання",
            items: [
              { question: "Питання 1?", answer: "Відповідь 1" },
              { question: "Питання 2?", answer: "Відповідь 2" },
            ],
          },
        },
      ],
      footer: [],
    },
    visibleZones: ["main"],
  },
};

// ── Site Templates ───────────────────────────────────────────

const blankSite: SiteTemplateConfig = {
  pages: [
    { slug: "home", title: "Головна", pageData: blankPage.pageData },
  ],
  settings: { ...DEFAULT_SITE_SETTINGS },
};

const portfolioSite: SiteTemplateConfig = {
  pages: [
    {
      slug: "home",
      title: "Головна",
      pageData: {
        version: 1,
        zones: {
          sidebar: [],
          header: [],
          main: [
            {
              id: "portfolio-hero",
              type: "hero",
              order: 0,
              props: {
                title: "Моє Портфоліо",
                subtitle: "Творчі проекти та роботи",
                backgroundImage: "",
                buttons: [],
                align: "center",
              },
            },
            {
              id: "portfolio-projects",
              type: "gallery",
              order: 1,
              props: {
                title: "Проекти",
                columns: "2",
                gap: "md",
              },
            },
          ],
          footer: [],
        },
        visibleZones: ["main"],
      },
    },
    {
      slug: "about",
      title: "Про мене",
      pageData: {
        version: 1,
        zones: {
          sidebar: [],
          header: [],
          main: [
            {
              id: "about-text",
              type: "text",
              order: 0,
              props: {
                title: "Про мене",
                content: "Розкажіть про себе...",
                level: "h1",
                align: "left",
              },
            },
          ],
          footer: [],
        },
        visibleZones: ["main"],
      },
    },
    {
      slug: "contacts",
      title: "Контакти",
      pageData: {
        version: 1,
        zones: {
          sidebar: [],
          header: [],
          main: [
            {
              id: "contacts-text",
              type: "text",
              order: 0,
              props: {
                title: "Контакти",
                content: "Email: example@email.com\nTelegram: @username",
                level: "h1",
                align: "center",
              },
            },
          ],
          footer: [],
        },
        visibleZones: ["main"],
      },
    },
  ],
  settings: {
    ...DEFAULT_SITE_SETTINGS,
    navigation: [
      { label: "Головна", pageSlug: "home", order: 0, icon: "home" },
      { label: "Про мене", pageSlug: "about", order: 1, icon: "user" },
      { label: "Контакти", pageSlug: "contacts", order: 2, icon: "mail" },
    ],
  },
};

const blogSite: SiteTemplateConfig = {
  pages: [
    {
      slug: "home",
      title: "Блог",
      pageData: {
        version: 1,
        zones: {
          sidebar: [],
          header: [],
          main: [
            {
              id: "blog-hero",
              type: "hero",
              order: 0,
              props: {
                title: "Мій Блог",
                subtitle: "Думки, ідеї, натхнення",
                backgroundImage: "",
                buttons: [],
                align: "center",
              },
            },
            {
              id: "blog-list",
              type: "list",
              order: 1,
              props: {
                items: [
                  { text: "Стаття 1", description: "Короткий опис" },
                  { text: "Стаття 2", description: "Короткий опис" },
                ],
                ordered: false,
              },
            },
          ],
          footer: [],
        },
        visibleZones: ["main"],
      },
    },
    {
      slug: "about",
      title: "Про автора",
      pageData: {
        version: 1,
        zones: {
          sidebar: [],
          header: [],
          main: [
            {
              id: "blog-about",
              type: "text",
              order: 0,
              props: {
                title: "Про автора",
                content: "Розкажіть про себе...",
                level: "h1",
                align: "left",
              },
            },
          ],
          footer: [],
        },
        visibleZones: ["main"],
      },
    },
  ],
  settings: {
    ...DEFAULT_SITE_SETTINGS,
    navigation: [
      { label: "Блог", pageSlug: "home", order: 0, icon: "home" },
      { label: "Про автора", pageSlug: "about", order: 1, icon: "user" },
    ],
  },
};

const businessSite: SiteTemplateConfig = {
  pages: [
    {
      slug: "home",
      title: "Головна",
      pageData: {
        version: 1,
        zones: {
          sidebar: [],
          header: [],
          main: [
            {
              id: "biz-hero",
              type: "hero",
              order: 0,
              props: {
                title: "Назва Компанії",
                subtitle: "Що ми робимо найкраще",
                backgroundImage: "",
                buttons: [
                  { text: "Наші послуги", url: "#services", variant: "primary" },
                ],
                align: "center",
              },
            },
            {
              id: "biz-divider-1",
              type: "divider",
              order: 1,
              props: { style: "gradient", spacing: "lg" },
            },
            {
              id: "biz-features",
              type: "feature-card",
              order: 2,
              props: {
                items: [
                  { icon: "star", title: "Послуга 1", description: "Опис послуги" },
                  { icon: "heart", title: "Послуга 2", description: "Опис послуги" },
                  { icon: "bookmark", title: "Послуга 3", description: "Опис послуги" },
                ],
                columns: "3",
              },
            },
          ],
          footer: [],
        },
        visibleZones: ["main"],
      },
    },
    {
      slug: "services",
      title: "Послуги",
      pageData: {
        version: 1,
        zones: {
          sidebar: [],
          header: [],
          main: [
            {
              id: "services-title",
              type: "text",
              order: 0,
              props: {
                title: "Наші Послуги",
                content: "",
                level: "h1",
                align: "center",
              },
            },
          ],
          footer: [],
        },
        visibleZones: ["main"],
      },
    },
    {
      slug: "about",
      title: "Про нас",
      pageData: {
        version: 1,
        zones: {
          sidebar: [],
          header: [],
          main: [
            {
              id: "about-title",
              type: "text",
              order: 0,
              props: {
                title: "Про Нас",
                content: "Розкажіть про компанію...",
                level: "h1",
                align: "left",
              },
            },
          ],
          footer: [],
        },
        visibleZones: ["main"],
      },
    },
    {
      slug: "contacts",
      title: "Контакти",
      pageData: {
        version: 1,
        zones: {
          sidebar: [],
          header: [],
          main: [
            {
              id: "contacts-title",
              type: "text",
              order: 0,
              props: {
                title: "Контакти",
                content: "Адреса: ...\nТелефон: ...\nEmail: ...",
                level: "h1",
                align: "center",
              },
            },
          ],
          footer: [],
        },
        visibleZones: ["main"],
      },
    },
  ],
  settings: {
    ...DEFAULT_SITE_SETTINGS,
    navigation: [
      { label: "Головна", pageSlug: "home", order: 0, icon: "home" },
      { label: "Послуги", pageSlug: "services", order: 1, icon: "grid" },
      { label: "Про нас", pageSlug: "about", order: 2, icon: "info" },
      { label: "Контакти", pageSlug: "contacts", order: 3, icon: "mail" },
    ],
  },
};

// ── Exports ──────────────────────────────────────────────────

/** Вбудовані page-шаблони. */
export const SYSTEM_PAGE_TEMPLATES: Template[] = [
  template("blank-page", "Порожня сторінка", "Чистий аркуш для творчості", "page", blankPage, ["blank"]),
  template("landing-page", "Лендінг", "Hero + features + CTA", "page", landingPage, ["landing", "marketing"]),
  template("business-card", "Візитка", "Контакти та посилання", "page", businessCardPage, ["contacts", "personal"]),
  template("event-page", "Сторінка події", "Дата + опис + FAQ", "page", eventPage, ["event", "registration"]),
];

/** Вбудовані site-шаблони. */
export const SYSTEM_SITE_TEMPLATES: Template[] = [
  template("blank-site", "Порожній сайт", "Мінімальний сайт з однією сторінкою", "site", blankSite, ["blank", "starter"]),
  template("portfolio", "Портфоліо", "Сайт-портфоліо: home + about + contacts", "site", portfolioSite, ["portfolio", "creative"]),
  template("blog", "Блог", "Простий блог: home + about", "site", blogSite, ["blog", "writing"]),
  template("business", "Бізнес-сайт", "Корпоративний сайт: home + services + about + contacts", "site", businessSite, ["business", "corporate"]),
];

/** Всі вбудовані шаблони. */
export const ALL_SYSTEM_TEMPLATES: Template[] = [
  ...SYSTEM_PAGE_TEMPLATES,
  ...SYSTEM_SITE_TEMPLATES,
];

/** Отримати шаблон за ID. */
export function getSystemTemplate(id: string): Template | undefined {
  return ALL_SYSTEM_TEMPLATES.find((t) => t.id === id);
}

/** Отримати шаблони за типом. */
export function getSystemTemplatesByType(type: "site" | "page"): Template[] {
  return ALL_SYSTEM_TEMPLATES.filter((t) => t.type === type);
}
