/**
 * Обране: що взагалі є ціллю і як її номер стає числом.
 *
 * Головний випадок тут — рядок. Контент віддає `ContentPage.id` **рядком**
 * (коли рядок прийшов без номера, ним стає адреса), тож `"34"` мусить доїхати
 * до бази числом, а адреса (`"pageslay"`) — не доїхати зовсім: інакше
 * `favorites.target_id` отримав би текстову ціль, якої не знайде жоден запит,
 * і серце мовчки не зберігалося б.
 *
 * Тут же — порядок списку: `created_at` лежить як UTC без позначки зони, тож
 * сортування мусить читати його тим самим правилом, що й показ дати.
 *
 * @module @wwwuabot/shared/favorites.test
 */

import { describe, expect, it } from "vitest";
import { favoriteTarget, favoriteTargetId, sortFavorites, type FavoriteItem } from "./favorites";

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

const entry = (id: number, title: string, savedAt: string | null): FavoriteItem => ({
  kind: "page",
  targetId: id,
  title,
  href: `/pages/${id}`,
  photoUrl: null,
  savedAt,
});

describe("порядок списку", () => {
  // Назви розставлені **протилежно** до дат: інакше обидва порядки збігалися б, і
  // тест доводив би лише те, що список не порожній.
  const oldOne = entry(1, "Абрикос", "2026-10-01 09:00:00");
  const newOne = entry(2, "Яблуко", "2026-10-16 09:00:00");

  it("за датою — найновіше першим", () => {
    expect(sortFavorites([oldOne, newOne], "date").map((item) => item.title)).toEqual([
      "Яблуко",
      "Абрикос",
    ]);
  });

  it("за назвою — абеткою, незалежно від дати", () => {
    expect(sortFavorites([oldOne, newOne], "name").map((item) => item.title)).toEqual([
      "Абрикос",
      "Яблуко",
    ]);
  });

  it("та сама дата не робить порядок випадковим", () => {
    const first = entry(3, "Бета", "2026-10-16 09:00:00");
    const second = entry(4, "Альфа", "2026-10-16 09:00:00");
    expect(sortFavorites([first, second], "date").map((item) => item.title)).toEqual([
      "Альфа",
      "Бета",
    ]);
  });

  it("невідома дата не забирає перше місце в того, чия дата є", () => {
    const unknown = entry(5, "Без дати", null);
    expect(sortFavorites([unknown, oldOne], "date")[0].title).toBe("Абрикос");
  });
});
