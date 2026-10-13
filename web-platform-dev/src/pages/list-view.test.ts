/**
 * Спільна смуга списку — пошук і чипи.
 *
 * Тут ламається мовчки: досить з'єднати слова запиту через «або» — і «вася
 * хмель» знайде всіх Вась і всіх Хмелів замість одного рядка; досить забути
 * зняти пробіли — і чип покаже «  вася » як окремий запит.
 *
 * @module web-platform-dev/src/pages/list-view.test
 */

import { describe, expect, it } from "vitest";
import { DEFAULT_LIST_VIEW, LIST_CLASS, filterByQuery, listChips } from "./list-view";

const people = [{ name: "Вася Хмель" }, { name: "Вася" }, { name: "Іван" }];
const byName = (person: { name: string }): readonly string[] => [person.name];

describe("пошук у списку", () => {
  it("порожній запит лишає список повним", () => {
    expect(filterByQuery(people, "", byName)).toHaveLength(people.length);
    expect(filterByQuery(people, "   ", byName)).toHaveLength(people.length);
  });

  it("слова запиту з'єднуються через «і», а не «або»", () => {
    expect(filterByQuery(people, "вася хмель", byName)).toEqual([people[0]]);
    expect(filterByQuery(people, "Вася", byName)).toHaveLength(2);
    expect(filterByQuery(people, "нема такого", byName)).toEqual([]);
  });

  it("порожні поля не ламають пошук", () => {
    expect(filterByQuery([{ name: null }], "х", (item) => [item.name])).toEqual([]);
    expect(filterByQuery([{ name: undefined }], "х", (item) => [item.name])).toEqual([]);
  });
});

describe("чипи смуги", () => {
  it("порожній запит чипа не має — він казав би те, що й так видно", () => {
    expect(listChips(DEFAULT_LIST_VIEW)).toEqual([]);
  });

  it("непорожній запит стає одним чипом, який повертає повний список", () => {
    const chips = listChips({ query: "  вася  " });
    expect(chips).toHaveLength(1);
    expect(chips[0].label).toBe("«вася»");
    expect(chips[0].reset).toEqual({ query: "" });
  });
});

describe("клас списку", () => {
  it("спільний для всіх цих екранів — інакше крок розійшовся б", () => {
    expect(LIST_CLASS).toBe("wb-collection wb-collection--rows");
  });
});
