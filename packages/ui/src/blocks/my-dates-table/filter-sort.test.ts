/**
 * Тести чистих функцій «Моїх дат».
 *
 * Логіка однакова і для сторінки `MyDatesPage`, і для Page Builder-блока, тому
 * саме тут ламається все, якщо хтось помилиться у фільтрі чи сортуванні
 * (docs/CONSOLIDATION_PLAN.md §3.3).
 */

import { describe, expect, it } from "vitest";
import type { MyDate } from "./types";
import { collectTags, filterDates, sortDates } from "./filter-sort";

const date = (over: Partial<MyDate> & { id: string }): MyDate => ({
  user_id: 1,
  date: "2026-01-01",
  type: "person",
  name: "",
  tags: [],
  notes: "",
  created_at: "2026-01-01 00:00:00",
  updated_at: "2026-01-01 00:00:00",
  ...over,
});

const dates: MyDate[] = [
  date({ id: "1", name: "Олег", date: "2026-03-05", tags: ["друг"], notes: "день народження" }),
  date({ id: "2", name: "Марія", date: "2026-01-20", type: "event", tags: ["родина", "друг"] }),
  date({ id: "3", name: "Ігор", date: "2026-02-11", type: "other" }),
];

describe("collectTags", () => {
  it("збирає унікальні теги й сортує їх", () => {
    expect(collectTags(dates)).toEqual(["друг", "родина"]);
  });

  it("не падає, коли тегів немає", () => {
    expect(collectTags([])).toEqual([]);
  });
});

describe("filterDates", () => {
  it("шукає по імені, примітках і тегах одночасно", () => {
    expect(filterDates(dates, "олег", {}).map((d) => d.id)).toEqual(["1"]);
    expect(filterDates(dates, "народження", {}).map((d) => d.id)).toEqual(["1"]);
    expect(filterDates(dates, "родина", {}).map((d) => d.id)).toEqual(["2"]);
  });

  it("фільтрує по колонці типу", () => {
    expect(filterDates(dates, "", { type: ["event"] }).map((d) => d.id)).toEqual(["2"]);
  });

  it("фільтр по тегах спрацьовує, якщо збігся хоч один тег", () => {
    expect(filterDates(dates, "", { tags: ["друг"] }).map((d) => d.id)).toEqual(["1", "2"]);
  });

  it("порожній фільтр означає «показати все», а не «нічого»", () => {
    expect(filterDates(dates, "", { name: [], type: [] })).toHaveLength(3);
  });
});

describe("sortDates", () => {
  it("сортує за датою, не змінюючи вихідний масив", () => {
    const sorted = sortDates(dates, "date", "desc");
    expect(sorted.map((d) => d.id)).toEqual(["1", "3", "2"]);
    expect(dates.map((d) => d.id)).toEqual(["1", "2", "3"]);
  });

  it("сортує за назвою українською за зростанням", () => {
    expect(sortDates(dates, "name", "asc").map((d) => d.name)).toEqual(["Ігор", "Марія", "Олег"]);
  });
});
