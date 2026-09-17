/**
 * Вигляд колекції — модель.
 *
 * Перевіряємо те, що легко зламати мовчки: що **типове — рядки** (список
 * читають заради тексту), що «рядки» не мають колонок (інакше «рядки · 1» і
 * «рядки · 2» були б двома станами, які виглядають однаково, і галочка в
 * пікері стояла б двічі), і що клас розкладки називає саме вибраний варіант —
 * його читає той, хто малює список.
 */

import { describe, expect, it } from "vitest";
import {
  COLLECTION_OPTIONS,
  DEFAULT_COLLECTION_VIEW,
  collectionViewClass,
  collectionViewLabel,
  collectionViewShort,
  sameCollectionView,
} from "./types";

describe("collection view", () => {
  it("типове — рядки, і колонки при них нічого не міняють", () => {
    expect(DEFAULT_COLLECTION_VIEW.layout).toBe("rows");
    expect(sameCollectionView(DEFAULT_COLLECTION_VIEW, { layout: "rows", columns: 1 })).toBe(true);
  });

  it("плитки розрізняються колонками, рядки — ні", () => {
    expect(
      sameCollectionView({ layout: "cards", columns: 2 }, { layout: "cards", columns: 2 }),
    ).toBe(true);
    expect(
      sameCollectionView({ layout: "cards", columns: 1 }, { layout: "cards", columns: 2 }),
    ).toBe(false);
    expect(
      sameCollectionView({ layout: "rows", columns: 2 }, { layout: "cards", columns: 2 }),
    ).toBe(false);
  });

  it("клас розкладки називає саме вибраний варіант", () => {
    expect(collectionViewClass({ layout: "rows", columns: 2 })).toBe(
      "wb-collection wb-collection--rows",
    );
    expect(collectionViewClass({ layout: "cards", columns: 1 })).toBe(
      "wb-collection wb-collection--cards wb-collection--cols-1",
    );
    expect(collectionViewClass({ layout: "cards", columns: 2 })).toContain("wb-collection--cols-2");
  });

  it("підпис називає поточний вибір: у клітинці лише знак", () => {
    expect(collectionViewLabel({ layout: "rows", columns: 2 })).toBe("Рядки");
    expect(collectionViewLabel({ layout: "cards", columns: 1 })).toBe("Картки — 1 колонка");
    expect(collectionViewShort({ layout: "cards", columns: 2 })).toBe("Картки · 2");
    expect(collectionViewShort({ layout: "rows", columns: 2 })).toBe("Рядки");
  });

  it("варіанти пікера — по одному на кожен стан, без дублів", () => {
    // Дубль означав би, що два різні підписи обирають те саме — і галочка в
    // списку стояла б на обох.
    for (const a of COLLECTION_OPTIONS) {
      for (const b of COLLECTION_OPTIONS) {
        expect(sameCollectionView(a.view, b.view)).toBe(a.key === b.key);
      }
    }
    expect(
      COLLECTION_OPTIONS.map((option) => `${option.view.layout}:${option.view.columns}`),
    ).toEqual(["rows:2", "cards:1", "cards:2"]);
  });

  it("варіанти розрізняються знаком: один знак на два варіанти нічого не каже", () => {
    const icons = COLLECTION_OPTIONS.map((option) => option.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });
});
