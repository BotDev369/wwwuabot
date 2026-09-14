import { describe, expect, it } from "vitest";
import {
  filterFields,
  isSlugConflict,
  readId,
  readNextSlug,
  readSlug,
  rowFilter,
} from "./scenarios-address";

describe("readId", () => {
  it("приймає число й числовий рядок", () => {
    expect(readId({ id: 7 })).toBe(7);
    expect(readId({ id: "7" })).toBe(7);
  });

  it("не приймає нуль, дробове, сміття й відсутнє поле", () => {
    expect(readId({})).toBeNull();
    expect(readId({ id: 0 })).toBeNull();
    expect(readId({ id: -3 })).toBeNull();
    expect(readId({ id: 1.5 })).toBeNull();
    expect(readId({ id: "abc" })).toBeNull();
    expect(readId({ id: null })).toBeNull();
  });
});

describe("readSlug", () => {
  it("порожній рядок — це головна сторінка, а не «поля немає»", () => {
    expect(readSlug({ slug: "" })).toBe("");
    expect(readSlug({ slug: "  " })).toBe("");
    expect(readSlug({ slug: "/" })).toBe("");
  });

  it("нормалізує слеші й відкидає невалідні сегменти", () => {
    expect(readSlug({ slug: "/mydate/" })).toBe("mydate");
    expect(readSlug({ slug: "galyashop/cart" })).toBe("galyashop/cart");
    expect(readSlug({ slug: "my_date" })).toBeNull();
    expect(readSlug({ slug: "Mydate" })).toBeNull();
    expect(readSlug({ slug: undefined })).toBeNull();
  });
});

describe("readNextSlug", () => {
  it("розрізняє «поле не передали» і «передали невалідне»", () => {
    expect(readNextSlug({ title: "x" })).toBeUndefined();
    expect(readNextSlug({ slug: "mydate" })).toBe("mydate");
    expect(readNextSlug({ slug: "bad_slug" })).toBeNull();
  });
});

describe("rowFilter", () => {
  it("шукає за номером, якщо він є", () => {
    expect(rowFilter({ id: 5, slug: "mydate" })).toEqual({ column: "id", value: 5 });
  });

  it("падає на адресу, коли номера немає", () => {
    expect(rowFilter({ slug: "mydate" })).toEqual({ column: "slug", value: "mydate" });
    expect(rowFilter({ slug: "" })).toEqual({ column: "slug", value: "" });
  });

  it("без номера й адреси повертає null", () => {
    expect(rowFilter({})).toBeNull();
    expect(rowFilter({ slug: "нотатка" })).toBeNull();
  });
});

describe("filterFields", () => {
  it("не пише службові поля й адресу", () => {
    const fields = filterFields({
      id: 3,
      slug: "mydate",
      created_at: "2026-01-01",
      updated_at: "2026-01-02",
      title: "Mydate",
    });
    expect(fields).toEqual({ title: "Mydate" });
  });

  it("об'єкти серіалізує, порожній рядок робить NULL", () => {
    expect(filterFields({ page_data: { version: 1 }, caption_top: "" })).toEqual({
      page_data: JSON.stringify({ version: 1 }),
      caption_top: null,
    });
  });

  it("ігнорує ключі, непридатні для SQL", () => {
    expect(filterFields({ 'title = "x"': 1, "1bad": 2, title: 3 })).toEqual({ title: 3 });
  });

  it("ігнорує колонки, яких немає в реєстрі", () => {
    // Невідома колонка дала б `no such column` — тобто 500 на помилку клієнта.
    expect(filterFields({ id_extra: 1, titel: "друкарська помилка" })).toEqual({});
    expect(filterFields({ title: "ok" })).toEqual({ title: "ok" });
  });
});

describe("isSlugConflict", () => {
  it("розпізнає зайняту адресу", () => {
    expect(isSlugConflict(new Error("UNIQUE constraint failed: scenarios.slug"))).toBe(true);
    expect(isSlugConflict(new Error("D1_ERROR: something else"))).toBe(false);
    expect(isSlugConflict("UNIQUE constraint failed: scenarios.slug")).toBe(false);
  });
});
