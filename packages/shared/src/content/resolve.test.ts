import { describe, it, expect } from "vitest";
import {
  BOT_SEPARATOR,
  HOME_SLUG,
  LEGACY_HOME_KEY,
  MAX_BOT_PAYLOAD,
  botPayloadSegments,
  isDeepLinkable,
  isValidSlug,
  normalizeSlug,
  pickContentPage,
  resolveBotPayload,
  resolveContentRoute,
  slugSegments,
  toBotPayload,
  toWebPath,
} from "./resolve";
import type { ContentPage } from "./types";

const page = (slug: string): ContentPage => ({
  id: slug,
  slug,
  title: null,
  photoUrl: null,
  content: null,
  source: "site_pages",
  published: true,
  order: 0,
});

describe("normalizeSlug", () => {
  it("порожній шлях, слеш і легасі-ключ — це головна", () => {
    expect(normalizeSlug("")).toBe(HOME_SLUG);
    expect(normalizeSlug(undefined)).toBe(HOME_SLUG);
    expect(normalizeSlug(null)).toBe(HOME_SLUG);
    expect(normalizeSlug("   ")).toBe(HOME_SLUG);
    expect(normalizeSlug("/")).toBe(HOME_SLUG);
    expect(normalizeSlug(LEGACY_HOME_KEY)).toBe(HOME_SLUG);
  });

  it("зрізає провідні й кінцеві слеші та подвоєні", () => {
    expect(normalizeSlug("/pro-nas")).toBe("pro-nas");
    expect(normalizeSlug("/pro-nas/")).toBe("pro-nas");
    expect(normalizeSlug("mydate//today")).toBe("mydate/today");
  });

  it("відкидає query й хеш — адреса приходить із рядка браузера", () => {
    expect(normalizeSlug("/mydate/1980-03-03/today?utm=1")).toBe("mydate/1980-03-03/today");
    expect(normalizeSlug("mydate#top")).toBe("mydate");
  });

  it("не змінює регістр і не переписує символи — це перевірка, не правка", () => {
    expect(normalizeSlug("/ProNas")).toBe("ProNas");
    expect(normalizeSlug("a_b")).toBe("a_b");
  });
});

describe("slugSegments", () => {
  it("розкладає адресу на сегменти; головна — порожній список", () => {
    expect(slugSegments("mydate/1980-03-03/today")).toEqual(["mydate", "1980-03-03", "today"]);
    expect(slugSegments("/pro-nas/")).toEqual(["pro-nas"]);
    expect(slugSegments(HOME_SLUG)).toEqual([]);
    expect(slugSegments("/")).toEqual([]);
  });
});

describe("isValidSlug", () => {
  it("приймає канонічні адреси, зокрема головну", () => {
    for (const slug of ["", "a", "pro-nas", "mydate/1980-03-03/today", "a1/b2-c3"]) {
      expect(isValidSlug(slug), slug).toBe(true);
    }
  });

  it("відкидає те, чого не може бути в адресі", () => {
    // `_` — розділювач сегментів у боті, тож усередині сегмента його немає;
    // про великі літери й інші символи — див. докладніше нижче.
    for (const slug of ["a_b", "ProNas", "a.b", "a b", "a-", "-a", "a+б"]) {
      expect(isValidSlug(slug), slug).toBe(false);
    }
  });
});

describe("подання адреси: веб і бот", () => {
  it("веб-шлях — сегменти через `/`, головна — `/`", () => {
    expect(toWebPath("mydate")).toBe("/mydate");
    expect(toWebPath("mydate", ["1980-03-03", "today"])).toBe("/mydate/1980-03-03/today");
    expect(toWebPath(HOME_SLUG)).toBe("/");
  });

  it("діплінк — ті самі сегменти через `_`, головна — порожній параметр", () => {
    expect(toBotPayload("mydate")).toBe("mydate");
    expect(toBotPayload("mydate", ["1980-03-03", "today"])).toBe("mydate_1980-03-03_today");
    expect(toBotPayload(HOME_SLUG)).toBe("");
    expect(BOT_SEPARATOR).toBe("_");
  });

  it("зворотне перетворення діплінка", () => {
    expect(botPayloadSegments("mydate_1980-03-03_today")).toEqual([
      "mydate",
      "1980-03-03",
      "today",
    ]);
    expect(botPayloadSegments("")).toEqual([]);
    expect(botPayloadSegments(null)).toEqual([]);
  });

  it("межа Telegram: 64 символи — це межа, а не «десь так»", () => {
    expect(isDeepLinkable("a".repeat(MAX_BOT_PAYLOAD))).toBe(true);
    expect(isDeepLinkable("a".repeat(MAX_BOT_PAYLOAD + 1))).toBe(false);
    // Параметри додаються до адреси, тож місце витрачають і вони.
    expect(isDeepLinkable("a", ["b".repeat(MAX_BOT_PAYLOAD)])).toBe(false);
  });
});

describe("resolveContentRoute", () => {
  const home = page(HOME_SLUG);
  const mydate = page("mydate");
  const about = page("about");

  it("порожня адреса — головна", () => {
    expect(resolveContentRoute([home, about], "")?.page.slug).toBe(HOME_SLUG);
    expect(resolveContentRoute([home, about], "/")?.page.slug).toBe(HOME_SLUG);
  });

  it("хвіст адреси стає параметрами, а не іншою сторінкою", () => {
    // Днів у таблиці немає і не мусить бути: `1980-03-03` — дані сторінки.
    const route = resolveContentRoute([home, mydate], "/mydate/1980-03-03/today");

    expect(route?.page.slug).toBe("mydate");
    expect(route?.params).toEqual(["1980-03-03", "today"]);
    expect(resolveContentRoute([home, about], "about")?.params).toEqual([]);
  });

  it("невідома адреса — це `null`, а не головна", () => {
    // Відкат — рішення виклику (`pickContentPage`), а не самого правила.
    expect(resolveContentRoute([home, about], "нема-такої")).toBeNull();
    expect(resolveContentRoute([about], "")).toBeNull();
  });

  it("найдовший збіг перемагає — інакше адреса залежала б від порядку в масиві", () => {
    const nested = page("mydate/today");
    const route = resolveContentRoute([home, mydate, nested], "/mydate/today/x");

    expect(route?.page.slug).toBe("mydate/today");
    expect(route?.params).toEqual(["x"]);

    // І той самий набір у зворотному порядку дає ту саму відповідь.
    const reversed = resolveContentRoute([nested, mydate, home], "/mydate/today/x");
    expect(reversed?.page.slug).toBe("mydate/today");
  });

  it("адреса в базі може бути записана зі слешами — це не різні адреси", () => {
    expect(resolveContentRoute([home, page("/about/")], "/about")?.page.slug).toBe("/about/");
  });
});

describe("resolveBotPayload", () => {
  const home = page(HOME_SLUG);
  const mydate = page("mydate");

  it("діплінк веде на ту саму сторінку, що й веб-шлях", () => {
    const fromBot = resolveBotPayload([home, mydate], "mydate_1980-03-03_today");
    const fromWeb = resolveContentRoute([home, mydate], "/mydate/1980-03-03/today");

    expect(fromBot?.page.slug).toBe(fromWeb?.page.slug);
    expect(fromBot?.params).toEqual(fromWeb?.params);
  });

  it("порожній параметр — головна, невідомий — `null`", () => {
    expect(resolveBotPayload([home, mydate], "")?.page.slug).toBe(HOME_SLUG);
    expect(resolveBotPayload([home, mydate], null)?.page.slug).toBe(HOME_SLUG);
    expect(resolveBotPayload([home, mydate], "нема_такої")).toBeNull();
  });

  /** Причина, чому `isValidSlug` забороняє `_` в сегменті: без цього зворотне
   * перетворення діплінка неоднозначне, і сторінку неможливо знайти. */
  it("адреса з `_` не має зворотного перетворення", () => {
    const broken = page("a_b");

    expect(toBotPayload("a_b")).toBe("a_b");
    expect(resolveBotPayload([home, broken], "a_b")).toBeNull();
  });

  it.each([
    ["about", []],
    ["mydate", ["1980-03-03", "today"]],
  ])("кругообіг: %s + %j", (slug, params) => {
    const route = resolveBotPayload([home, page(slug)], toBotPayload(slug, params));

    expect(route?.page.slug).toBe(slug);
    expect(route?.params).toEqual(params);
  });
});

describe("pickContentPage", () => {
  it("відкатується на головну, коли адреса невідома", () => {
    expect(pickContentPage([page(HOME_SLUG), page("about")], "нема-такої")?.slug).toBe(HOME_SLUG);
  });
});
