/**
 * Правила товару: адреса, галерея, характеристики й те, що **не** проходить.
 *
 * Головне, що тут фіксується: адреса складається з назви (українська назва дає
 * латинський сегмент), порожні характеристики не зберігаються, а товар без
 * назви не існує — бо в каталозі нема чого показати.
 *
 * @module @wwwuabot/shared/shop
 */

import { describe, expect, it } from "vitest";
import {
  PRODUCT_ATTRIBUTES_MAX,
  PRODUCT_SLUG_MAX,
  cleanImageIds,
  productAddress,
  sanitizeProductAttributes,
  validateProductDraft,
} from "./products";

describe("адреса товару", () => {
  it("українська назва перекладається латиницею", () => {
    expect(productAddress("", "Кава на розі")).toEqual({ ok: true, value: "kava-na-rozi" });
  });

  it("поле адреси перекриває назву, а не змішується з нею", () => {
    expect(productAddress("espresso-250", "Кава на розі")).toEqual({
      ok: true,
      value: "espresso-250",
    });
  });

  it("обрізає хвіст і не лишає дефіса в кінці", () => {
    const address = productAddress("", "надзвичайно довга назва товару для перевірки стелі");
    expect(address.ok).toBe(true);
    expect(address.ok && address.value.length).toBeLessThanOrEqual(PRODUCT_SLUG_MAX);
    expect(address.ok && address.value.endsWith("-")).toBe(false);
  });

  it("⛔ назва, яка не дає сегмента, — це помилка, а не порожня адреса", () => {
    const address = productAddress("", "??? !!!");
    expect(address.ok).toBe(false);
    expect(address.ok === false && address.message).toContain("латиницею");
  });
});

describe("характеристики товару", () => {
  it("пари без назви або без значення не зберігаються", () => {
    expect(
      sanitizeProductAttributes([
        { name: "Довжина", value: "40 см" },
        { name: "", value: "120 см" },
        { name: "Вага", value: "  " },
        { name: "Колір", value: "Чорний" },
      ]),
    ).toEqual([
      { name: "Довжина", value: "40 см" },
      { name: "Колір", value: "Чорний" },
    ]);
  });

  it("друга пара з тією ж назвою не переписує першу", () => {
    expect(
      sanitizeProductAttributes([
        { name: "Довжина", value: "40 см" },
        { name: "довжина", value: "200 см" },
      ]),
    ).toEqual([{ name: "Довжина", value: "40 см" }]);
  });

  it("перелік не росте понад стелю", () => {
    const many = Array.from({ length: PRODUCT_ATTRIBUTES_MAX + 5 }, (_, i) => ({
      name: `Поле ${i}`,
      value: "значення",
    }));
    expect(sanitizeProductAttributes(many)).toHaveLength(PRODUCT_ATTRIBUTES_MAX);
  });
});

describe("галерея товару", () => {
  it("лишає номери файлів, відкидає сміття й повтори", () => {
    expect(cleanImageIds(["7", 7, 0, -3, 12.5, "абв", 9])).toEqual([7, 9]);
  });
});

describe("чернетка товару", () => {
  it("обов'язкові назва й вид — решта може лишатись порожньою", () => {
    const result = validateProductDraft({ kind: "physical", title: "Чашка" });

    expect(result.ok).toBe(true);
    expect(result.ok && result.value).toMatchObject({
      slug: "chashka",
      kind: "physical",
      title: "Чашка",
      price: "",
      attributes: [],
      images: [],
      // Прапорець відсутній — товар показується: чернетка вмикається явно.
      isActive: true,
    });
  });

  it("⛔ без назви товару немає", () => {
    expect(validateProductDraft({ kind: "physical", title: "   " })).toEqual({
      ok: false,
      message: "Назва товару — обов'язкова",
    });
  });

  it("⛔ вигаданий вид не записується — вид це поведінка", () => {
    const result = validateProductDraft({ kind: "нематеріальний", title: "Чашка" });
    expect(result.ok).toBe(false);
  });

  it("ціна лишається текстом: «договірна» — теж ціна", () => {
    const result = validateProductDraft({ kind: "service", title: "Ремонт", price: "договірна" });
    expect(result.ok && result.value.price).toBe("договірна");
  });

  it("чернетка вмикається явним `false`", () => {
    const result = validateProductDraft({ kind: "digital", title: "Курс", isActive: false });
    expect(result.ok && result.value.isActive).toBe(false);
  });
});
