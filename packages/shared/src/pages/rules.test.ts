import { describe, expect, it } from "vitest";
import { normalizePageSlug, pageAddress, PAGE_SLUG_MAX } from "./address";
import { pageDraft, validatePageDraft } from "./rules";
import {
  buildPageConfig,
  pageTemplate,
  pageTitle,
  readPageValues,
  type PageFieldValues,
} from "./templates";

const card = pageTemplate("card");
const event = pageTemplate("event");

describe("адреса сторінки", () => {
  it("перекладає кирилицю латиницею — інакше з назви не було б сегмента", () => {
    expect(normalizePageSlug("Іван Петренко")).toBe("ivan-petrenko");
    expect(normalizePageSlug("Їжачок і Ґудзик")).toBe("izhachok-i-gudzyk");
  });

  it("пробіл, підкреслення й знаки стають дефісом, зайве — відкидається", () => {
    // `_` усередині сегмента заборонений: це розділювач Telegram-payload.
    expect(normalizePageSlug("моя_сторінка")).toBe("moia-storinka");
    expect(normalizePageSlug("Вечір — 20:00!")).toBe("vechir-20-00");
    expect(normalizePageSlug("   ...   ")).toBe("");
  });

  it("не робить сегмент довшим за стелю", () => {
    expect(normalizePageSlug("а".repeat(120)).length).toBeLessThanOrEqual(PAGE_SLUG_MAX);
  });

  it("порожня адреса складається з назви — адресу не питають, її показують", () => {
    const result = pageAddress("", "Осінній ярмарок");
    expect(result).toEqual({ ok: true, value: "osinnii-iarmarok" });
  });

  it("⛔ зайнятий платформою сегмент — причина, а не тихо змінений slug", () => {
    // Інакше збережене посилання вело б у розділ платформи, а не на сторінку.
    for (const taken of ["space", "pages", "profile", "api"]) {
      const result = pageAddress(taken, "Байдуже");
      expect(result.ok).toBe(false);
    }
  });

  it("⛔ назва без латиниці не дає адреси — і це сказано причиною", () => {
    expect(pageAddress("", "!!!").ok).toBe(false);
  });
});

describe("перевірка чернетки", () => {
  it("обов'язкова лише назва; решта полів може лишатись порожньою", () => {
    const tooLittle = validatePageDraft({ template: "card", values: { tagline: "щось" } });
    expect(tooLittle.ok).toBe(false);

    const enough = validatePageDraft({
      template: "card",
      values: { title: "Оксана", about: "  " },
    });
    expect(enough.ok).toBe(true);
    if (enough.ok) expect(enough.value.values).toEqual({ title: "Оксана" });
  });

  it("приватність типово вимкнена: увімкнути може лише явне `true`", () => {
    for (const raw of [undefined, false, 1, "true", "1"]) {
      const result = validatePageDraft({ template: "card", values: { title: "О" }, isPublic: raw });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.isPublic).toBe(false);
    }

    const open = validatePageDraft({ template: "card", values: { title: "О" }, isPublic: true });
    expect(open.ok).toBe(true);
    if (open.ok) expect(open.value.isPublic).toBe(true);
  });

  it("невідомий шаблон не записується — список ключів закритий", () => {
    expect(validatePageDraft({ template: "site", values: { title: "О" } }).ok).toBe(false);
  });

  it("довге поле притискається до межі шаблону, а не відхиляється", () => {
    const result = validatePageDraft({
      template: "event",
      values: { title: "О".repeat(300) },
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.values.title).toHaveLength(80);
  });
});

describe("шаблон ↔ page_data", () => {
  it("будує блоки в порядку полів і лише для заповнених", () => {
    const config = buildPageConfig(card, { title: "Оксана", about: "Пишу тексти" });
    expect(config.zones.main.map((block) => block.id)).toEqual(["card-title", "card-about"]);
    expect(config.zones.main.map((block) => block.order)).toEqual([0, 1]);
    expect(config.zones.header).toEqual([]);
  });

  it("значення читаються назад — форма відкриває те, що писав автор", () => {
    const values: PageFieldValues = {
      title: "Оксана",
      tagline: "Пишу тексти",
      about: "Перший абзац.\n\nДругий.",
      contact: "оксана@example.com",
    };
    const back = readPageValues(card, buildPageConfig(card, values));
    expect(back).toEqual(values);
    expect(pageTitle(card, back)).toBe("Оксана");
  });

  it("чужі блоки полями не стають: сторінку могло пожити в редакторі блоків", () => {
    const config = buildPageConfig(event, { title: "Ярмарок" });
    config.zones.main.push({
      id: "card-title",
      type: "text",
      order: 9,
      props: { content: "чуже" },
    });
    expect(readPageValues(card, config)).toEqual({ title: "чуже" });
    expect(readPageValues(event, config)).toEqual({ title: "Ярмарок" });
  });

  it("порожня назва в чернетці не стає полем — порожніх заголовків на сторінці немає", () => {
    expect(buildPageConfig(card, { title: "   ", about: "є" }).zones.main).toHaveLength(1);
  });
});

describe("чернетка зі збереженої сторінки", () => {
  it("віддає те саме, що писав автор, — разом з адресою", () => {
    const draft = pageDraft({
      id: 7,
      slug: "osinnii-iarmarok",
      title: "Осінній ярмарок",
      template: "event",
      values: { title: "Осінній ярмарок", where: "Парк" },
      isPublic: true,
      updatedAt: "2026-09-22 10:00:00",
    });

    expect(draft).toEqual({
      id: 7,
      template: "event",
      values: { title: "Осінній ярмарок", where: "Парк" },
      address: "osinnii-iarmarok",
      isPublic: true,
    });
  });
});
