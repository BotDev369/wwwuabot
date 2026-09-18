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
import { queryWords, selectedTags } from "../collection";
import { formatNoteStamp, noteTimestamp } from "./format";
import { DEFAULT_NOTES_VIEW, type NotesView } from "./types";
import { buildGroups, collectTags, filterNotes, foundTags, viewChips } from "./view";

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

describe("знайдені теги", () => {
  const tags = ["київ", "карас", "нотатки"];

  it("називає ті теги, які знайшов пошук", () => {
    // Це різниця між «тег є в нотатці» і «тег і є тим, що шукали».
    expect(foundTags(tags, view({ query: "карас" }))).toEqual(["карас"]);
    // Порівняння ті самі, що в пошуку: регістр і `#` не мають значення.
    expect(foundTags(tags, view({ query: "#КАРАС" }))).toEqual(["карас"]);
  });

  it("знаходить тег за частиною слова — як і текст", () => {
    expect(foundTags(tags, view({ query: "киї" }))).toEqual(["київ"]);
  });

  it("вибраний у фільтрі тег — теж знайдений", () => {
    expect(foundTags(tags, view({ tags: { kind: "tags", tags: ["нотатки"] } }))).toEqual([
      "нотатки",
    ]);
  });

  it("нічого не шукали — нічого й не знайдено", () => {
    // Акцентувати всі теги, коли пошуку немає, означало б акцентувати ніщо.
    expect(foundTags(tags, view())).toEqual([]);
    expect(foundTags(tags, view({ query: "   " }))).toEqual([]);
    // «Без хештегів» — не тег, тож і не знайдений.
    expect(foundTags(tags, view({ tags: { kind: "untagged" } }))).toEqual([]);
  });

  it("пошук за текстом не робить знайденими всі теги нотатки", () => {
    // Інакше «знайденим» виглядало б усе, що стоїть у рядку поруч.
    expect(foundTags(tags, view({ query: "хліб" }))).toEqual([]);
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
    const kept = filterNotes(notes, view({ tags: { kind: "tags", tags: ["київ"] } }));
    expect(kept.map((n) => n.id).sort()).toEqual([1, 3]);
  });

  it("кілька тегів вимагають УСІ, а не хоч один", () => {
    // Фільтр звужує список: нотатка 3 має і «київ», і «лал», тож вона єдина.
    const both = view({ tags: { kind: "tags", tags: ["київ", "лал"] } });
    expect(filterNotes(notes, both).map((n) => n.id)).toEqual([3]);
    // А «або» дало б [1, 3] — саме цю різницю й тримає тест.
    expect(selectedTags(both.tags)).toEqual(["київ", "лал"]);
  });

  it("порожній список тегів нічого не відсіює", () => {
    expect(filterNotes(notes, view({ tags: { kind: "tags", tags: [] } }))).toHaveLength(3);
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
});

describe("чипи вибраного", () => {
  it("типовий вигляд — жодного чипа: постійні чипи це ті самі «овали», що ми прибрали", () => {
    expect(viewChips(view())).toEqual([]);
  });

  it("кожен вибір — свій чип із тим, що саме він вертає", () => {
    const chips = viewChips(
      view({
        query: "київ",
        tags: { kind: "tags", tags: ["київ"] },
        sort: "created-desc",
        // Групи — теж вибір: типово їх немає, тож чип з'являється саме тоді,
        // коли їх увімкнули.
        groupBy: "day",
      }),
    );

    expect(chips.map((chip) => chip.key)).toEqual(["query", "tag:київ", "sort", "group"]);
    expect(chips.map((chip) => chip.label)).toEqual(["«київ»", "#київ", "Нові", "За днями"]);
    // Скидання чипа чіпає РІВНО один вибір — решта мусить лишитись як була.
    expect(chips.map((chip) => Object.keys(chip.reset))).toEqual([
      ["query"],
      ["tags"],
      ["sort"],
      ["groupBy"],
    ]);
  });

  it("кожен вибраний тег — свій чип, і зняття одного не втрачає решти", () => {
    // Це і є мультивибір у смузі: два теги — два чипи зі своїми діями.
    const tags = { kind: "tags", tags: ["київ", "лал"] } as const;
    const chips = viewChips(view({ tags }));

    expect(chips.map((chip) => chip.key)).toEqual(["tag:київ", "tag:лал"]);
    expect(chips.map((chip) => chip.action)).toEqual([
      "Прибрати фільтр за хештегом #київ",
      "Прибрати фільтр за хештегом #лал",
    ]);
    // Кожен чип знімає рівно СВІЙ тег: після першого лишається «лал», після
    // другого — «київ». Це і є різниця між мультивибором і одноразовим вибором.
    expect(chips[0].reset).toEqual({ tags: { kind: "tags", tags: ["лал"] } });
    expect(chips[1].reset).toEqual({ tags: { kind: "tags", tags: ["київ"] } });
  });

  it("скидання чипа вертає типовий вибір, а не порожнечу", () => {
    const [sortChip] = viewChips(view({ sort: "created-desc" }));
    const [tagChip] = viewChips(view({ tags: { kind: "untagged" } }));

    expect({ ...view(), ...sortChip.reset }).toEqual(DEFAULT_NOTES_VIEW);
    expect({ ...view(), ...tagChip.reset }).toEqual(DEFAULT_NOTES_VIEW);
  });

  it("порожній пошук чипа не має: пробіл — це не запит", () => {
    expect(viewChips(view({ query: "   " }))).toEqual([]);
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
