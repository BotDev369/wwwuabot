import { describe, expect, it } from "vitest";
import type { PageConfig } from "../types/page-config.types";
import { normalizePageSlug, pageAddress, PAGE_SLUG_MAX } from "./address";
import { pageDraft, validatePageDraft } from "./rules";
import { buildPageConfig, readPageValues } from "./page-data";
import { pageTemplate, pageTitle, type PageFieldValues } from "./templates";

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
  it("каркас розгортається в блоки: порожнє не лишає по собі ні блока, ні лінії", () => {
    const config = buildPageConfig(card, { title: "Оксана", about: "Пишу тексти" });
    // `tagline` і `contact` порожні — їхніх блоків немає зовсім; лінія, яка
    // лишилась би останньою, теж не потрапляє: розділяти нічого.
    expect(config.zones.main.map((block) => block.id)).toEqual(["card-head", "card-about"]);
    expect(config.zones.main.map((block) => block.order)).toEqual([0, 1]);
    expect(config.zones.header).toEqual([]);
  });

  it("назва стоїть заголовком у картці, текст розділу — під підписом розділу", () => {
    const config = buildPageConfig(card, {
      title: "Оксана",
      about: "Пишу тексти",
      contact: "Київ",
    });
    const [head, about, divider, contact] = config.zones.main;

    // Заголовок — це картка з підняттям і найбільшим щаблем: саме там видно ім'я.
    expect(head.type).toBe("card");
    expect(head.props.elevated).toBe(true);
    expect(head.children?.[0].props.title).toBe("Оксана");
    expect(head.children?.[0].props.level).toBe("h1");
    // А порожній рядок про себе не лишає по собі блока взагалі.
    expect(head.children).toHaveLength(1);

    // Підпис розділу («Про себе») — структура шаблону: він у заголовку картки,
    // текст людини — у блоці всередині.
    expect(about.props.title).toBe("Про себе");
    expect(about.children?.[0].props.content).toBe("Пишу тексти");
    expect(divider.type).toBe("divider");
    expect(contact.props.title).toBe("Зв'язок");
    expect(contact.children?.[0].props.content).toBe("Київ");
  });

  it("розділювач стоїть лише між розділами — ні в кінці, ні на початку його немає", () => {
    const trimmed = buildPageConfig(event, { title: "Ярмарок", where: "Парк" });
    expect(trimmed.zones.main.map((block) => block.id)).toEqual(["event-head", "event-where"]);

    const full = buildPageConfig(event, event.preview);
    expect(full.zones.main.map((block) => block.id)).toEqual([
      "event-head",
      "event-where",
      "event-divider",
      "event-about",
      "event-terms",
    ]);
  });

  it("сторінка, збережена до поділу заголовка й тіла, читається як є", () => {
    // Назва тоді лежала в `content`: загубити її при першому ж відкритті форми
    // означало б стерти текст людини мовчки.
    const legacy: PageConfig = {
      version: 1,
      zones: {
        sidebar: [],
        header: [],
        footer: [],
        main: [{ id: "card-title", type: "text", order: 0, props: { content: "Стара назва" } }],
      },
      visibleZones: ["main"],
    };

    expect(readPageValues(card, legacy)).toEqual({ title: "Стара назва" });
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
    const config = buildPageConfig(card, { title: "Оксана", about: "Пишу тексти" });
    config.zones.main.push({
      id: "card-title",
      type: "text",
      order: 9,
      props: { content: "чуже" },
    });
    expect(readPageValues(card, config)).toEqual({ title: "Оксана", about: "Пишу тексти" });
  });

  it("старий шлях читання не підміняє текст підписом картки", () => {
    // Картка «Про себе» має `id` `card-about`, і якби старий шлях (блок
    // `шаблон-поле`) спрацьовував завжди, її підпис став би текстом людини.
    const config = buildPageConfig(card, { title: "Оксана" });
    expect(readPageValues(card, config)).toEqual({ title: "Оксана" });
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
