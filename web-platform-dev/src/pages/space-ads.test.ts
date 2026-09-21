/**
 * Список дошки — те, що ламається мовчки.
 *
 * Тут два правила, яких не видно ні в компіляторі, ні на око:
 * **чернетки мусять стояти в списку** (вони не на дошці, тож без цього людина
 * не бачила б їх узагалі) і **«моє» визначається один раз, а не в розмітці** —
 * інакше зникла б або кнопка «Змінити» під чужим, або дії під своїм.
 *
 * @module web-platform-dev/src/pages/space-ads.test
 */

import { describe, expect, it } from "vitest";
import type { Ad } from "@wwwuabot/shared/ads";
import { adDraftFrom, composeAds } from "./ads-list";

function ad(overrides: Partial<Ad> & { id: number }): Ad {
  return {
    ownerId: 1,
    kind: "sell",
    title: "",
    body: "",
    price: "",
    place: "",
    isActive: true,
    createdAt: "2026-01-01 00:00:00",
    updatedAt: "2026-01-01 00:00:00",
    ...overrides,
  };
}

describe("список дошки", () => {
  it("чернетки стоять першими — інакше їх не видно ніде", () => {
    const board = [ad({ id: 1, title: "Показане" })];
    const own = [
      ad({ id: 1, title: "Показане" }),
      ad({ id: 2, title: "Чернетка", isActive: false }),
    ];

    const items = composeAds(board, own);

    expect(items.map((item) => item.ad.id)).toEqual([2, 1]);
    expect(items[0].mine).toBe(true);
  });

  it("«моє» — це оголошення серед власних, а не всі на дошці", () => {
    const board = [ad({ id: 1 }), ad({ id: 5, ownerId: 9 })];
    const own = [ad({ id: 1 })];

    const items = composeAds(board, own);

    expect(items.map((item) => item.mine)).toEqual([true, false]);
  });

  it("порядок дошки не переставляється: його дала база", () => {
    const board = [ad({ id: 7 }), ad({ id: 3 }), ad({ id: 1 })];

    expect(composeAds(board, []).map((item) => item.ad.id)).toEqual([7, 3, 1]);
  });

  it("без чернеток і без свого список — це рівно дошка", () => {
    expect(composeAds([], []).length).toBe(0);
    expect(composeAds([ad({ id: 4 })], []).length).toBe(1);
  });
});

describe("оголошення → чернетка форми", () => {
  it("переносить усі поля: забуте поле стерлося б при збереженні", () => {
    const source = ad({
      id: 3,
      kind: "rentOut",
      title: "Здам квартиру",
      body: "Дві кімнати",
      price: "15 000 ₴",
      place: "Львів",
    });

    expect(adDraftFrom(source)).toEqual({
      id: 3,
      kind: "rentOut",
      title: "Здам квартиру",
      body: "Дві кімнати",
      price: "15 000 ₴",
      place: "Львів",
      isActive: true,
    });
  });

  it("перекриває лише назване — «прибрати/показати» не чіпає решти", () => {
    const source = ad({ id: 3, title: "Риба", price: "100 ₴" });
    const draft = adDraftFrom(source, { isActive: !source.isActive });

    expect(draft.isActive).toBe(false);
    expect(draft.title).toBe("Риба");
    expect(draft.price).toBe("100 ₴");
    expect(draft.id).toBe(3);
  });
});
