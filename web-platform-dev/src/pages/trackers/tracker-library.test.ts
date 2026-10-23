/**
 * Два джерела на один рядок списку: каталог і чужі публічні визначення.
 * Перевіряємо саме те, що бачить людина: групу (тематика або автор), підпис
 * (ціль), джерело для копії та стан кнопки.
 *
 * @module web-platform-dev/src/pages/trackers/tracker-library.test
 */

import { describe, expect, it } from "vitest";
import type { PublicTracker, TrackerTemplate } from "@wwwuabot/shared/trackers";
import { filterLibrary, groupLibrary, publicItems, templateItems } from "./tracker-library";

const water: TrackerTemplate = {
  key: "water",
  title: "Вода",
  unit: "л",
  step: 0.25,
  goal: 2,
  min: 0,
  max: 20,
  mode: "sum",
  icon: "droplet",
  groupKey: "routine",
  added: false,
};

const weight: TrackerTemplate = {
  key: "weight",
  title: "Вага",
  unit: "кг",
  step: 0.1,
  goal: null,
  min: 0,
  max: 500,
  mode: "read",
  icon: "progress",
  groupKey: "wellbeing",
  added: true,
};

const shared: PublicTracker = {
  id: 12,
  title: "Кава вдома",
  unit: "чашки",
  step: 1,
  goal: 3,
  min: 0,
  max: 10,
  mode: "sum",
  valueType: "number",
  icon: "cup",
  author: "олена",
  mine: false,
};

describe("шаблони", () => {
  it("рядок каталогу несе тематику групи, ціль і джерело копії", () => {
    const [row] = templateItems([water]);

    expect(row.source).toBe("catalog:water");
    expect(row.title).toBe("Вода");
    expect(row.group).toBe("Режим");
    expect(row.meta).toBe("ціль 2 л");
    expect(row.icon).toBe("droplet");
    expect(row.added).toBe(false);
  });

  it("без цілі підпис каже «без цілі», а не «ціль —»", () => {
    expect(templateItems([weight])[0].meta).toBe("без цілі");
  });

  it("уже доданий шаблон каже «Додано»", () => {
    expect(templateItems([weight])[0].added).toBe(true);
  });
});

describe("публічні", () => {
  it("група — ім'я на платформі з решіткою, не Telegram-нік", () => {
    expect(publicItems([shared])[0].group).toBe("#олена");
    expect(publicItems([shared])[0].meta).toBe("ціль 3 чашки");
  });

  it("закритий профіль не лишає порожнього місця — група «спільнота»", () => {
    expect(publicItems([{ ...shared, author: "" }])[0].group).toBe("спільнота");
  });

  it("своє опубліковане вже позначене як додане", () => {
    const [row] = publicItems([{ ...shared, mine: true }]);

    expect(row.added).toBe(true);
    expect(row.source).toBe("public:12");
  });
});

describe("дерево списку", () => {
  it("рядки одного заголовка стоять разом, а не врізнобіч", () => {
    const groups = groupLibrary(
      templateItems([water, weight, { ...water, key: "tea", title: "Чай" }]),
    );

    expect(groups.map((group) => group.title)).toEqual(["Режим", "Самопочуття"]);
    expect(groups[0].items.map((item) => item.title)).toEqual(["Вода", "Чай"]);
  });

  it("порожній список — порожнє дерево, а не група без рядків", () => {
    expect(groupLibrary([])).toEqual([]);
  });
});

describe("пошук", () => {
  const items = [...templateItems([water, weight]), ...publicItems([shared])];

  it("порожній запит лишає весь список і не віддає той самий масив", () => {
    const result = filterLibrary(items, "  ");

    expect(result).toHaveLength(3);
    expect(result).not.toBe(items);
  });

  it("збіг у назві не залежить від регістру", () => {
    expect(filterLibrary(items, "ВАГА").map((item) => item.title)).toEqual(["Вага"]);
  });

  it("збіг у групі знаходить і за тематикою, і за автором", () => {
    expect(filterLibrary(items, "режим").map((item) => item.title)).toEqual(["Вода"]);
    expect(filterLibrary(items, "олена").map((item) => item.title)).toEqual(["Кава вдома"]);
  });

  it("нічого не знайдено — порожній список, а не весь", () => {
    expect(filterLibrary(items, "цукор")).toEqual([]);
  });
});
