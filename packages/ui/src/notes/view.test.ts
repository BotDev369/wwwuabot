/**
 * Правила списку нотаток.
 *
 * Перевіряємо саме те, що ламається мовчки: чи знаходиться нотатка за
 * хештегом (теги в базі — без `#` і в нижньому регістрі), чи «київ свято»
 * вимагає обидва слова, чи межі груп «Сьогодні / Вчора» рахуються від
 * опівночі, і що нотатка без тегів не зникає з групування за тегами.
 */

import { describe, expect, it } from "vitest";
import type { NoteRow } from "@wwwuabot/shared/notes";
import { formatNoteStamp, noteTimestamp } from "./format";
import { DEFAULT_NOTES_VIEW, type NotesView } from "./types";
import { buildGroups, collectTags, filterNotes, isDefaultView, queryWords } from "./view";

/** Нотатка-фікстура: усе, крім переданого, має осмислений типовий вигляд. */
function note(id: number, over: Partial<NoteRow> = {}): NoteRow {
  return {
    id,
    scope: "user",
    owner_id: "1",
    text: `нотатка ${id}`,
    tags: [],
    created_at: "2026-09-16 10:00:00",
    updated_at: "2026-09-16 10:00:00",
    ...over,
  };
}

const view = (over: Partial<NotesView> = {}): NotesView => ({ ...DEFAULT_NOTES_VIEW, ...over });

/** 16.09.2026 — «зараз» для перевірок груп. */
const NOW = Date.UTC(2026, 8, 16, 12, 0, 0);

/**
 * Мітка в форматі колонки: ЛОКАЛЬНА доба, зсунута на `daysAgo` назад.
 *
 * Саме локальна — бо межі груп («Сьогодні» / «Вчора») рахуються від
 * опівночі **екрана**, а не від UTC. Інакше тест проходив би лише
 * в одній таймзоні, а в іншій «вчорашня» нотатка виглядала б як сьогоднішня.
 */
function stamp(daysAgo: number, hour?: number): string {
  const date = new Date(NOW);
  date.setDate(date.getDate() - daysAgo);
  if (hour !== undefined) date.setHours(hour, 0, 0, 0);
  return date.toISOString().replace("T", " ").slice(0, 19);
}

describe("пошук", () => {
  it("розбирає запит: регістр і `#` не мають значення", () => {
    expect(queryWords("#Київ, свято")).toEqual(["київ,", "свято"]);
    expect(queryWords("   ")).toEqual([]);
  });

  it("знаходить за текстом і за хештегом", () => {
    const notes = [
      note(1, { text: "купити каву" }),
      note(2, { text: "інше", tags: ["київ"] }),
      note(3, { text: "нічого спільного" }),
    ];

    expect(filterNotes(notes, view({ query: "каву" })).map((n) => n.id)).toEqual([1]);
    // У базі тег лежить без `#`, тож запит із `#` мусить знайти його так само.
    expect(filterNotes(notes, view({ query: "#київ" })).map((n) => n.id)).toEqual([2]);
  });

  it("вимагає ВСІ слова, а не хоч одне", () => {
    const notes = [note(1, { text: "київ і свято" }), note(2, { text: "лише київ" })];
    expect(filterNotes(notes, view({ query: "київ свято" })).map((n) => n.id)).toEqual([1]);
  });

  it("порожній запит нічого не відсіює", () => {
    const notes = [note(1), note(2)];
    expect(filterNotes(notes, view({ query: "  " }))).toHaveLength(2);
  });
});

describe("фільтр за хештегами", () => {
  const notes = [
    note(1, { tags: ["київ"] }),
    note(2, { tags: [] }),
    note(3, { tags: ["київ", "лал"] }),
  ];

  it("«усі» не відсіює нічого", () => {
    expect(filterNotes(notes, view())).toHaveLength(3);
  });

  it("конкретний тег лишає тільки його", () => {
    const kept = filterNotes(notes, view({ tags: { kind: "tag", tag: "київ" } }));
    expect(kept.map((n) => n.id).sort()).toEqual([1, 3]);
  });

  it("«без хештегів» — це окремий фільтр, а не порожній тег", () => {
    expect(filterNotes(notes, view({ tags: { kind: "untagged" } })).map((n) => n.id)).toEqual([2]);
  });

  it("збирає теги за абеткою й без повторів", () => {
    expect(collectTags(notes)).toEqual(["київ", "лал"]);
  });
});

describe("сортування", () => {
  const notes = [
    note(1, { text: "б", created_at: "2026-09-10 10:00:00", updated_at: "2026-09-15 10:00:00" }),
    note(2, { text: "а", created_at: "2026-09-14 10:00:00", updated_at: "2026-09-14 10:00:00" }),
    note(3, { text: "в", created_at: "2026-09-16 10:00:00", updated_at: "2026-09-16 10:00:00" }),
  ];

  it("типово — найсвіжіше змінені згори", () => {
    expect(filterNotes(notes, view()).map((n) => n.id)).toEqual([3, 1, 2]);
  });

  it("уміє від найдавніших і за часом створення", () => {
    expect(filterNotes(notes, view({ sort: "updated-asc" })).map((n) => n.id)).toEqual([2, 1, 3]);
    expect(filterNotes(notes, view({ sort: "created-asc" })).map((n) => n.id)).toEqual([1, 2, 3]);
  });

  it("«за текстом» сортує українською абеткою", () => {
    expect(filterNotes(notes, view({ sort: "alpha" })).map((n) => n.text)).toEqual(["а", "б", "в"]);
  });

  it("не чіпає вхідний масив", () => {
    const original = [note(1), note(2)];
    filterNotes(original, view({ sort: "alpha" }));
    expect(original.map((n) => n.id)).toEqual([1, 2]);
  });
});

describe("групування", () => {
  const notes = [
    note(1, { updated_at: stamp(0) }),
    note(2, { updated_at: stamp(1) }),
    note(3, { updated_at: stamp(3) }),
    note(4, { updated_at: stamp(15) }),
    note(5, { updated_at: stamp(200) }),
  ];

  it("за днями: від «Сьогодні» до «Давніше», без порожніх груп", () => {
    const groups = buildGroups(notes, view({ groupBy: "day" }), NOW);
    expect(groups.map((g) => g.label)).toEqual([
      "Сьогодні",
      "Вчора",
      "Раніше цього тижня",
      "Раніше цього місяця",
      "Давніше",
    ]);
    expect(groups.map((g) => g.notes.map((n) => n.id))).toEqual([[1], [2], [3], [4], [5]]);
  });

  it("межа «Вчора» рахується від опівночі, а не від 24 годин", () => {
    // Пізній вечір учора — це вже інший календарний день, хоч від «зараз»
    // минуло менше ніж доба.
    const lastNight = note(9, { updated_at: stamp(1, 23) });
    const groups = buildGroups([lastNight], view({ groupBy: "day" }), NOW);
    expect(groups[0].label).toBe("Вчора");
  });

  it("за хештегами: нотатка з двома тегами стоїть у кожній своїй групі", () => {
    const tagged = [note(1, { tags: ["київ"] }), note(2, { tags: ["київ", "лал"] }), note(3)];
    const groups = buildGroups(tagged, view({ groupBy: "tag" }), NOW);

    expect(groups.map((g) => g.label)).toEqual(["#київ", "#лал", "Без хештегів"]);
    expect(groups[0].notes.map((n) => n.id)).toEqual([1, 2]);
    expect(groups[1].notes.map((n) => n.id)).toEqual([2]);
    expect(groups[2].notes.map((n) => n.id)).toEqual([3]);
  });

  it("«без груп» — один список, і він порожній, коли нічого не знайшлось", () => {
    expect(buildGroups(notes, view({ groupBy: "none", query: "такого-нема" }), NOW)).toEqual([]);
    expect(buildGroups(notes, view({ groupBy: "none" }), NOW)[0].notes).toHaveLength(5);
  });

  it("пошук діє всередині груп, а не лише на весь список", () => {
    const groups = buildGroups(notes, view({ groupBy: "day", query: "нотатка 5" }), NOW);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Давніше");
  });

  it("«скинути» показуємо лише тоді, коли щось справді змінено", () => {
    expect(isDefaultView(view())).toBe(true);
    expect(isDefaultView(view({ query: "київ" }))).toBe(false);
    expect(isDefaultView(view({ groupBy: "none" }))).toBe(false);
  });
});

describe("час нотатки", () => {
  it("читає UTC без позначки зони саме як UTC", () => {
    expect(noteTimestamp("2026-09-16 15:19:00")).toBe(Date.UTC(2026, 8, 16, 15, 19, 0));
  });

  it("невалідне значення не робить із себе дату", () => {
    expect(noteTimestamp("")).toBe(0);
    expect(noteTimestamp("не дата")).toBe(0);
    expect(formatNoteStamp("не дата")).toBe("не дата");
  });
});
