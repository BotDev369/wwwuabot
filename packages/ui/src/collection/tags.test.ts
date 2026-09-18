/**
 * Правила хештегів — **спільні для всіх списків**.
 *
 * Перевіряємо саме те, що ламається мовчки: що мультивибір прибирає рівно свій
 * тег (а не всі), що порядок тегів не залежить від порядку дотиків (інакше чипи
 * переставлялись би місцями), що прибраний останній тег вертає до «усі» (а не
 * лишає фільтр, який нічого не фільтрує) і що «кілька тегів» означає **усі**, а
 * не «хоч один» — це та сама різниця, що між звуженням списку й розширенням.
 *
 * Ці самі правила вживають нотатки й контакти, тож перевіряються вони тут —
 * один раз і на своєму місці, а не в тесті одного зі списків.
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_TAG_FILTER,
  UNTAGGED_LABEL,
  hitTags,
  matchesTagFilter,
  queryWords,
  selectedTags,
  tagFilterLabel,
  toggleTagFilter,
  uniqueTags,
} from "./tags";

describe("перемикання тегів (мультивибір)", () => {
  it("додає тег до вибраних, не чіпаючи решти", () => {
    const once = toggleTagFilter({ kind: "all" }, "київ");
    expect(toggleTagFilter(once, "лал")).toEqual({ kind: "tags", tags: ["київ", "лал"] });
  });

  it("повторний дотик прибирає РІВНО цей тег", () => {
    const both = toggleTagFilter(toggleTagFilter({ kind: "all" }, "київ"), "лал");
    expect(toggleTagFilter(both, "київ")).toEqual({ kind: "tags", tags: ["лал"] });
  });

  it("прибраний останній тег — це «усі», а не порожній вибір", () => {
    // Порожній список тегів виглядав би як вибір, який нічого не фільтрує.
    expect(toggleTagFilter({ kind: "tags", tags: ["київ"] }, "київ")).toEqual(DEFAULT_TAG_FILTER);
  });

  it("дотик по тегу забирає з «без хештегів»", () => {
    expect(toggleTagFilter({ kind: "untagged" }, "київ")).toEqual({
      kind: "tags",
      tags: ["київ"],
    });
  });

  it("порядок тегів сталий — за абеткою, а не за порядком дотиків", () => {
    const lalFirst = toggleTagFilter(toggleTagFilter({ kind: "all" }, "лал"), "київ");
    expect(selectedTags(lalFirst)).toEqual(["київ", "лал"]);
  });

  it("не чіпає вихідний фільтр", () => {
    const filter = { kind: "tags", tags: ["київ"] } as const;
    toggleTagFilter(filter, "лал");
    expect(filter.tags).toEqual(["київ"]);
  });

  it("називає фільтр словами — їх читає скрінрідер у клітинці без підпису", () => {
    expect(tagFilterLabel({ kind: "all" })).toBe("Усі теги");
    expect(tagFilterLabel({ kind: "untagged" })).toBe(UNTAGGED_LABEL);
    expect(tagFilterLabel({ kind: "tags", tags: ["київ", "лал"] })).toBe("#київ, #лал");
  });

  it("«усі» й «без хештегів» не називають жодного тега", () => {
    expect(selectedTags({ kind: "all" })).toEqual([]);
    expect(selectedTags({ kind: "untagged" })).toEqual([]);
  });
});

describe("чи проходить елемент фільтр", () => {
  const tags = ["київ", "лал"];

  it("«усі» пропускає все, навіть без хештегів", () => {
    expect(matchesTagFilter(tags, { kind: "all" })).toBe(true);
    expect(matchesTagFilter([], { kind: "all" })).toBe(true);
  });

  it("«без хештегів» — це окремий фільтр, а не порожній тег", () => {
    expect(matchesTagFilter([], { kind: "untagged" })).toBe(true);
    expect(matchesTagFilter(tags, { kind: "untagged" })).toBe(false);
  });

  it("кілька тегів вимагають УСІ, а не хоч один", () => {
    expect(matchesTagFilter(tags, { kind: "tags", tags: ["київ", "лал"] })).toBe(true);
    expect(matchesTagFilter(tags, { kind: "tags", tags: ["київ", "карас"] })).toBe(false);
    // Порожній список тегів не відсіює нічого — це те саме «усі».
    expect(matchesTagFilter(tags, { kind: "tags", tags: [] })).toBe(true);
  });
});

describe("запит і теги списку", () => {
  it("розбирає запит: регістр і `#` не мають значення", () => {
    expect(queryWords("#Київ, свято")).toEqual(["київ,", "свято"]);
    expect(queryWords("   ")).toEqual([]);
  });

  it("збирає теги за абеткою й без повторів", () => {
    expect(uniqueTags([["київ", "лал"], ["київ"], []])).toEqual(["київ", "лал"]);
    expect(uniqueTags([])).toEqual([]);
  });

  it("акцентує ті теги, які знайшов пошук або фільтр", () => {
    // Різниця між «тег є в елементі» і «тег і є тим, що шукали».
    expect(hitTags(["київ", "карас"], ["карас"], [])).toEqual(["карас"]);
    expect(hitTags(["київ", "карас"], [], ["київ"])).toEqual(["київ"]);
    expect(hitTags(["київ"], ["хліб"], [])).toEqual([]);
  });
});
