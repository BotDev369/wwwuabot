import { describe, it, expect } from "vitest";
import { contentPageFromScenario, contentPageFromSitePage } from "./adapters";
import { HOME_KEY, contentKeyFromPath, pickContentPage } from "./resolve";
import type { SitePage } from "../types/site.types";

// ── Хелпери ──────────────────────────────────────────────────────

const pageConfig = (title: string) => ({
  version: 1,
  zones: {
    sidebar: [],
    header: [],
    main: [{ id: "b1", type: "text", order: 0, props: { title } }],
    footer: [],
  },
});

const sitePage = (over: Partial<SitePage> = {}): SitePage => ({
  id: "page-1",
  siteId: "site-1",
  slug: "home",
  title: "Головна",
  pageData: pageConfig("Привіт"),
  orderIndex: 0,
  status: "published",
  createdAt: "2026-09-13 10:00:00",
  updatedAt: "2026-09-13 10:00:00",
  ...over,
});

// ── Адаптер сценарію ─────────────────────────────────────────────

describe("contentPageFromScenario", () => {
  it("нормалізує сценарій із новим форматом page_data", () => {
    const page = contentPageFromScenario({
      codeword: "about",
      title: "Про нас",
      web_slug: "/pro-nas",
      page_data: JSON.stringify(pageConfig("Про нас")),
      is_active: 1,
    });

    expect(page.key).toBe("about");
    expect(page.id).toBe("about");
    expect(page.webSlug).toBe("/pro-nas");
    expect(page.title).toBe("Про нас");
    expect(page.source).toBe("scenarios");
    expect(page.published).toBe(true);
    expect(page.content?.zones.main).toHaveLength(1);
  });

  it("конвертує легасі-формат slots, а не повертає null", () => {
    const legacy = {
      v: 1,
      slots: { main: [{ component: "Heading", props: { text: "Старий" } }] },
    };

    const page = contentPageFromScenario({
      codeword: "legacy",
      page_data: JSON.stringify(legacy),
    });

    expect(page.content).not.toBeNull();
    expect(page.content?.zones.main[0]?.type).toBe("text");
    expect(page.content?.zones.main[0]?.props.title).toBe("Старий");
  });

  it("порожній page_data дає content: null, а не порожню конфігурацію", () => {
    const page = contentPageFromScenario({ codeword: "new" });

    expect(page.content).toBeNull();
    expect(page.webSlug).toBeNull();
    expect(page.title).toBeNull();
    expect(page.photoUrl).toBeNull();
  });

  it("метадані сторінки (title, photo_url) доходять до моделі", () => {
    const page = contentPageFromScenario({
      codeword: "about",
      title: "Про нас",
      photo_url: "https://example.com/a.jpg",
    });

    expect(page.title).toBe("Про нас");
    expect(page.photoUrl).toBe("https://example.com/a.jpg");
  });

  it("битий JSON не пробиває помилку назовні", () => {
    const page = contentPageFromScenario({
      codeword: "broken",
      page_data: "{це не json",
    });

    expect(page.content).toBeNull();
  });

  it("is_active = NULL читається як «не опубліковано» — так само, як SQL-фільтр", () => {
    const page = contentPageFromScenario({ codeword: "old", is_active: null });

    expect(page.published).toBe(false);
  });

  it("is_active з D1 може прийти рядком", () => {
    expect(contentPageFromScenario({ codeword: "a", is_active: "1" }).published).toBe(true);
    expect(contentPageFromScenario({ codeword: "b", is_active: "0" }).published).toBe(false);
    expect(contentPageFromScenario({ codeword: "c", is_active: 0 }).published).toBe(false);
  });

  it("позначає джерело: сценарії адмінки — окреме сховище", () => {
    const page = contentPageFromScenario({ codeword: "admin-only" }, "scenarios-admin");

    expect(page.source).toBe("scenarios-admin");
  });
});

// ── Адаптер сторінки сайту ───────────────────────────────────────

describe("contentPageFromSitePage", () => {
  it("нормалізує сторінку сайту разом із порядком", () => {
    const page = contentPageFromSitePage(sitePage({ slug: "contacts", orderIndex: 3 }));

    expect(page.id).toBe("page-1");
    expect(page.key).toBe("contacts");
    expect(page.order).toBe(3);
    expect(page.source).toBe("site_pages");
    expect(page.webSlug).toBeNull();
  });

  it("публічність береться зі status, а не з наявності контенту", () => {
    expect(contentPageFromSitePage(sitePage({ status: "published" })).published).toBe(true);
    expect(contentPageFromSitePage(sitePage({ status: "draft" })).published).toBe(false);
  });

  it("контент не парситься вдруге — береться готовий pageData", () => {
    const page = contentPageFromSitePage(sitePage());

    expect(page.content?.zones.main[0]?.props.title).toBe("Привіт");
  });
});

// ── Правило «яка сторінка для цього URL» ────────────────────────

describe("contentKeyFromPath", () => {
  it("порожній шлях — це головна сторінка", () => {
    expect(contentKeyFromPath("")).toBe(HOME_KEY);
    expect(contentKeyFromPath(undefined)).toBe(HOME_KEY);
    expect(contentKeyFromPath(null)).toBe(HOME_KEY);
    expect(contentKeyFromPath("   ")).toBe(HOME_KEY);
  });

  it("зрізає провідні слеші — web_slug у базі зберігається без них", () => {
    expect(contentKeyFromPath("/pro-nas")).toBe("pro-nas");
    expect(contentKeyFromPath("pro-nas")).toBe("pro-nas");
  });

  it("не чіпає службовий ключ головної", () => {
    expect(contentKeyFromPath(HOME_KEY)).toBe(HOME_KEY);
  });
});

describe("pickContentPage", () => {
  const home = contentPageFromScenario({ codeword: HOME_KEY, is_active: 1 });
  const about = contentPageFromScenario({ codeword: "about", is_active: 1 });
  const byWebSlug = contentPageFromScenario({
    codeword: "contacts",
    web_slug: "kontakty",
    is_active: 1,
  });

  it("знаходить сторінку за ключем", () => {
    expect(pickContentPage([home, about], "about")?.key).toBe("about");
  });

  it("знаходить сторінку за web_slug — ключ при цьому інший", () => {
    expect(pickContentPage([home, byWebSlug], "kontakty")?.key).toBe("contacts");
  });

  it("порожній шлях віддає головну", () => {
    expect(pickContentPage([about, home], "")?.key).toBe(HOME_KEY);
  });

  it("невідомий шлях віддає головну, а не першу-ліпшу сторінку", () => {
    // Мовчазний відкат на `pages[0]` показував би чужий контент замість 404.
    expect(pickContentPage([about, home], "не-існує")?.key).toBe(HOME_KEY);
  });

  it("без головної в наборі повертає null, а не вигадує сторінку", () => {
    expect(pickContentPage([about], "не-існує")).toBeNull();
  });

  it("на порожньому наборі повертає null", () => {
    expect(pickContentPage([], "about")).toBeNull();
  });
});
