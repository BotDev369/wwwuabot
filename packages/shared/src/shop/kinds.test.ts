import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRODUCT_KIND,
  PRODUCT_KINDS,
  isProductKind,
  productKindHasFile,
  productKindLabel,
  productKindNeedsShipping,
} from "./kinds";

describe("види товару", () => {
  it("закритий перелік: усе, що в ньому, — вид; усе інше — ні", () => {
    for (const kind of PRODUCT_KINDS) expect(isProductKind(kind)).toBe(true);
    expect(isProductKind("goods")).toBe(false);
    expect(isProductKind("")).toBe(false);
    expect(isProductKind(null)).toBe(false);
    expect(isProductKind(7)).toBe(false);
  });

  it("типовий вид — серед наявних", () => {
    expect(isProductKind(DEFAULT_PRODUCT_KIND)).toBe(true);
  });

  it("доставку просить лише фізичний товар", () => {
    expect(productKindNeedsShipping("physical")).toBe(true);
    expect(productKindNeedsShipping("digital")).toBe(false);
    expect(productKindNeedsShipping("service")).toBe(false);
  });

  it("файл буває лише в цифрового товару", () => {
    expect(productKindHasFile("digital")).toBe(true);
    expect(productKindHasFile("physical")).toBe(false);
    expect(productKindHasFile("service")).toBe(false);
  });

  it("невідомий вид не просить доставки й не має файлу", () => {
    expect(productKindNeedsShipping("goods")).toBe(false);
    expect(productKindHasFile("goods")).toBe(false);
  });

  it("підпис відомий — словом, невідомий — як є, а не порожнечею", () => {
    expect(productKindLabel("digital")).toBe("Цифровий товар");
    expect(productKindLabel("goods")).toBe("goods");
    expect(productKindLabel(null)).toBe("");
  });
});
