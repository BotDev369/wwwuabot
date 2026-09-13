import { describe, it, expect } from "vitest";
import { contentPageFromScenario } from "./adapters";
import { HOME_SLUG, pickContentPage } from "./resolve";

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

    expect(page.id).toBe("about");
    expect(page.title).toBe("Про нас");
    expect(page.published).toBe(true);
    expect(page.content?.zones.main).toHaveLength(1);
  });

  /**
   * Легасі-рядок має дві назви адреси — `web_slug` і `codeword`. У моделі
   * лишається одна, і перемагає `web_slug`: адреса — те, що людина бачить у
   * рядку браузера, а діплінк будується **з** адреси, не навпаки.
   */
  it("адресою стає web_slug, коли він є", () => {
    const page = contentPageFromScenario({ codeword: "contacts", web_slug: "/kontakty" });

    expect(page.slug).toBe("kontakty");
  });

  it("без web_slug адресою стає codeword — те саме «codeword і slug»", () => {
    expect(contentPageFromScenario({ codeword: "about" }).slug).toBe("about");
    // Порожній web_slug (а не відсутній) — теж випадок на користь codeword.
    expect(contentPageFromScenario({ codeword: "about", web_slug: "" }).slug).toBe("about");
  });

  it("легасі-ключ головної __base__ дає порожню адресу", () => {
    expect(contentPageFromScenario({ codeword: "__base__", web_slug: "/" }).slug).toBe(HOME_SLUG);
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

  it("is_active читається як NULL, число або рядок — так само, як SQL-фільтр", () => {
    expect(contentPageFromScenario({ codeword: "old", is_active: null }).published).toBe(false);
    expect(contentPageFromScenario({ codeword: "a", is_active: "1" }).published).toBe(true);
    expect(contentPageFromScenario({ codeword: "b", is_active: "0" }).published).toBe(false);
    expect(contentPageFromScenario({ codeword: "c", is_active: 0 }).published).toBe(false);
  });
});

// ── Адаптер сторінки сайту ───────────────────────────────────────

// ── Вибір сторінки (з відкатом на головну) ───────────────────────

describe("pickContentPage", () => {
  const home = contentPageFromScenario({ codeword: "__base__", is_active: 1 });
  const about = contentPageFromScenario({ codeword: "about", is_active: 1 });
  const byWebSlug = contentPageFromScenario({
    codeword: "contacts",
    web_slug: "kontakty",
    is_active: 1,
  });

  it("знаходить сторінку за адресою", () => {
    expect(pickContentPage([home, about], "about")?.slug).toBe("about");
  });

  it("авторить адресу, а не легасі-ключ діплінка", () => {
    // `contacts` був `codeword`; адреса сторінки — `kontakty`. Правило тепер
    // одне, тож другої назви, за якою можна знайти сторінку, не існує.
    expect(pickContentPage([home, byWebSlug], "kontakty")?.slug).toBe("kontakty");
    expect(pickContentPage([home, byWebSlug], "contacts")?.slug).toBe(HOME_SLUG);
  });

  it("порожній шлях віддає головну", () => {
    expect(pickContentPage([about, home], "")?.slug).toBe(HOME_SLUG);
  });

  it("невідомий шлях віддає головну, а не першу-ліпшу сторінку", () => {
    // Мовчазний відкат на першу-ліпшу сторінку показував би чужий контент замість 404.
    expect(pickContentPage([about, home], "не-існує")?.slug).toBe(HOME_SLUG);
  });

  it("хвіст адреси — це параметри тієї самої сторінки, а не інша сторінка", () => {
    // `/about/more` — сторінка `about` із параметром `more`: саме так
    // `/mydate/1980-03-03/today` лишається сторінкою `mydate`.
    expect(pickContentPage([home, about], "about/more")?.slug).toBe("about");
  });

  it("без головної в наборі повертає null, а не вигадує сторінку", () => {
    expect(pickContentPage([about], "не-існує")).toBeNull();
  });

  it("на порожньому наборі повертає null", () => {
    expect(pickContentPage([], "about")).toBeNull();
  });
});
