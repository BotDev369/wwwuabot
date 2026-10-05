/**
 * Дати: формат на екрані та придатність значення з адреси.
 *
 * `formatDate` мовчить на сміття навмисно, `isValidDate` — ні: значення приходить
 * з `?date=`, тож «не дата» мусить відкидатися, а не малюватися як «31.02.2026».
 *
 * @module packages/shared/src/utils/mydate-helpers.test
 */

import { describe, expect, it } from "vitest";
import type { MyDate } from "../types/mydate";
import {
  BASE_TYPE_CONFIG,
  BUILTIN_TYPES,
  formatDate,
  getAllTypes,
  getBaseTypeConfig,
  getCustomTypes,
  getFieldLabel,
  getTagColor,
  isValidDate,
  TAG_COLORS,
  type SortField,
} from "./mydate-helpers";

describe("formatDate", () => {
  it("перевертає YYYY-MM-DD у DD.MM.YYYY", () => {
    expect(formatDate("1980-03-03")).toBe("03.03.1980");
  });

  it("лишає незрозуміле значення як є", () => {
    expect(formatDate("сьогодні")).toBe("сьогодні");
    expect(formatDate("1980-03")).toBe("1980-03");
  });
});

describe("isValidDate", () => {
  it("приймає існуючу дату у календарному межах", () => {
    expect(isValidDate("1980-03-03")).toBe(true);
    expect(isValidDate("2024-02-29")).toBe(true);
  });

  it("відкидає дату, якої в календарі немає", () => {
    expect(isValidDate("2023-02-29")).toBe(false);
    expect(isValidDate("1980-13-01")).toBe(false);
    expect(isValidDate("1980-00-10")).toBe(false);
    expect(isValidDate("1980-04-31")).toBe(false);
    expect(isValidDate("1980-01-00")).toBe(false);
  });

  it("відкидає все, що не YYYY-MM-DD", () => {
    expect(isValidDate("")).toBe(false);
    expect(isValidDate("03.03.1980")).toBe(false);
    expect(isValidDate("1980-3-3")).toBe(false);
    expect(isValidDate("1980-03-03T00:00")).toBe(false);
  });
});

describe("getTagColor", () => {
  it("дає той самий колір для того самого тегу", () => {
    expect(getTagColor("сім'я")).toEqual(getTagColor("сім'я"));
  });

  it("колір приходить із палітри, а не з повітря", () => {
    for (const tag of ["а", "б", "в", "робота"]) {
      expect(TAG_COLORS).toContainEqual(getTagColor(tag));
    }
  });
});

describe("getBaseTypeConfig", () => {
  it("віддає колір відомого типу", () => {
    expect(getBaseTypeConfig("person")).toBe(BASE_TYPE_CONFIG.person);
  });

  it("невідомий тип показується як «інше», а не як порожнеча", () => {
    expect(getBaseTypeConfig("такого_немає")).toBe(BASE_TYPE_CONFIG.other);
  });
});

describe("getCustomTypes / getAllTypes", () => {
  const dates = [{ type: "person" }, { type: "подія" }, { type: "подія" }, { type: "" }].map(
    (d, i) => ({ ...d, id: String(i) }),
  ) as MyDate[];

  it("кастомні типи без дублів і без порожніх", () => {
    expect(getCustomTypes(dates)).toEqual(["подія"]);
  });

  it("загальний перелік починається з вбудованих", () => {
    expect(getAllTypes(dates)).toEqual([...BUILTIN_TYPES, "подія"]);
  });
});

describe("getFieldLabel", () => {
  it("перекладає кожне поле сортування", () => {
    expect(getFieldLabel("date")).toBe("Дата");
    expect(getFieldLabel("name")).toBe("Назва");
    expect(getFieldLabel("tags")).toBe("Теги");
    expect(getFieldLabel("type")).toBe("Тип");
    expect(getFieldLabel("notes")).toBe("Примітки");
    expect(getFieldLabel("created_at")).toBe("Створено");
  });

  it("невідоме поле показує як є, а не губиться", () => {
    expect(getFieldLabel("щось" as SortField)).toBe("щось");
  });
});
