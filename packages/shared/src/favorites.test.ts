/**
 * Обране: що взагалі є ціллю і як її номер стає числом.
 *
 * Головний випадок тут — рядок. Контент віддає `ContentPage.id` **рядком**
 * (коли рядок прийшов без номера, ним стає адреса), тож `"34"` мусить доїхати
 * до бази числом, а адреса (`"pageslay"`) — не доїхати зовсім: інакше
 * `favorites.target_id` отримав би текстову ціль, якої не знайде жоден запит,
 * і серце мовчки не зберігалося б.
 *
 * @module @wwwuabot/shared/favorites.test
 */

import { describe, expect, it } from "vitest";
import { favoriteTarget, favoriteTargetId } from "./favorites";

describe("номер цілі", () => {
  it("рядок із номером контенту стає числом", () => {
    expect(favoriteTargetId("34")).toBe(34);
    expect(favoriteTargetId(" 34 ")).toBe(34);
    expect(favoriteTargetId(34)).toBe(34);
  });

  it("нуль, від'ємне й дріб не є номером рядка", () => {
    expect(favoriteTargetId(0)).toBeNull();
    expect(favoriteTargetId("0")).toBeNull();
    expect(favoriteTargetId(-5)).toBeNull();
    expect(favoriteTargetId(1.5)).toBeNull();
  });

  it("адреса, порожнеча й не-число ціллю не стають", () => {
    for (const raw of ["", "   ", "pageslay", "34px", Number.NaN, Infinity, null, undefined]) {
      expect(favoriteTargetId(raw)).toBeNull();
    }
  });
});

describe("ціль із тіла запиту", () => {
  it("приймає рядковий номер і віддає число", () => {
    expect(favoriteTarget({ kind: "page", targetId: "34" })).toEqual({
      kind: "page",
      targetId: 34,
    });
  });

  it("чужі поля в тілі у ціль не проходять", () => {
    expect(favoriteTarget({ kind: "page", targetId: 5, owner_id: 999 })).toEqual({
      kind: "page",
      targetId: 5,
    });
  });

  it("інший вид або поганий номер — не ціль", () => {
    expect(favoriteTarget({ kind: "scenario", targetId: 5 })).toBeNull();
    expect(favoriteTarget({ kind: "page" })).toBeNull();
    expect(favoriteTarget("це не об'єкт")).toBeNull();
    expect(favoriteTarget(null)).toBeNull();
  });
});
