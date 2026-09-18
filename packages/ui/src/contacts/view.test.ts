/**
 * Правила списку контактів.
 *
 * Перевіряємо саме те, що ламається мовчки: чи знаходиться контакт за іменем,
 * хендлом, приміткою й хештегом (теги в базі — без `#` і в нижньому регістрі,
 * тож «#карас» мусить знайти «карас»), чи «карас київ» вимагає **обидва** слова,
 * чи межі груп «Сьогодні / Вчора» рахуються від опівночі, і що контакт без
 * тегів не зникає з групування за тегами.
 *
 * Окремо — те, чого в пошуку **не** має бути: Telegram-id. Його власник не
 * знає (id бачить бот), тож шукати за ним означало б шукати за тим, чого в
 * списку не видно.
 */

import { describe, expect, it } from "vitest";
import type { Contact } from "@wwwuabot/shared/contacts";
import { DEFAULT_CONTACTS_VIEW, type ContactsView } from "./types";
import {
  buildContactGroups,
  collectContactTags,
  contactViewChips,
  filterContacts,
  foundContactTags,
} from "./view";

/** Контакт-фікстура: усе, крім переданого, має осмислений типовий вигляд. */
function contact(id: number, over: Partial<Contact> = {}): Contact {
  return {
    id,
    name: `Контакт ${id}`,
    username: null,
    tags: [],
    notes: "",
    code: null,
    deepLink: null,
    joinedUserId: null,
    joinedBotAt: null,
    joinedPlatformAt: null,
    createdAt: "2026-09-18 10:00:00",
    updatedAt: "2026-09-18 10:00:00",
    invitedCount: 0,
    ...over,
  };
}

const view = (over: Partial<ContactsView> = {}): ContactsView => ({
  ...DEFAULT_CONTACTS_VIEW,
  ...over,
});

/** 18.09.2026 — «зараз» для перевірок груп. */
const NOW = Date.UTC(2026, 8, 18, 12, 0, 0);

/**
 * Мітка в форматі колонки: ЛОКАЛЬНА доба, зсунута на `daysAgo` назад.
 *
 * Саме локальна — бо межі груп рахуються від опівночі **екрана**, а не від UTC.
 * Інакше тест проходив би лише в одній таймзоні.
 */
function stamp(daysAgo: number, hour?: number): string {
  const date = new Date(NOW);
  date.setDate(date.getDate() - daysAgo);
  if (hour !== undefined) date.setHours(hour, 0, 0, 0);
  return date.toISOString().replace("T", " ").slice(0, 19);
}

describe("пошук", () => {
  const contacts = [
    contact(1, { name: "Олег Карась" }),
    contact(2, { name: "Марія", username: "maria_k" }),
    contact(3, { name: "Ігор", notes: "знайомий зі школи" }),
    contact(4, { name: "Петро", tags: ["київ"] }),
  ];

  it("знаходить за іменем, хендлом, приміткою й хештегом", () => {
    expect(filterContacts(contacts, view({ query: "карась" })).map((c) => c.id)).toEqual([1]);
    expect(filterContacts(contacts, view({ query: "maria" })).map((c) => c.id)).toEqual([2]);
    expect(filterContacts(contacts, view({ query: "школи" })).map((c) => c.id)).toEqual([3]);
    // У базі тег лежить без `#`, тож запит із `#` мусить знайти його так само.
    expect(filterContacts(contacts, view({ query: "#київ" })).map((c) => c.id)).toEqual([4]);
  });

  it("вимагає ВСІ слова, а не хоч одне", () => {
    expect(filterContacts(contacts, view({ query: "олег карась" })).map((c) => c.id)).toEqual([1]);
    expect(filterContacts(contacts, view({ query: "олег марія" }))).toEqual([]);
  });

  it("порожній запит нічого не відсіює", () => {
    expect(filterContacts(contacts, view({ query: "  " }))).toHaveLength(4);
  });

  it("⛔ за Telegram-id не шукає: його власник не знає", () => {
    const withId = [contact(1, { joinedUserId: 6281898553, joinedBotAt: "2026-09-18 03:45:00" })];

    expect(filterContacts(withId, view({ query: "6281898553" }))).toEqual([]);
  });
});

describe("знайдені теги", () => {
  const tags = ["київ", "карас", "друг"];

  it("називає ті теги, які знайшов пошук або фільтр", () => {
    expect(foundContactTags(tags, view({ query: "#КАРАС" }))).toEqual(["карас"]);
    expect(foundContactTags(tags, view({ tags: { kind: "tags", tags: ["друг"] } }))).toEqual([
      "друг",
    ]);
  });

  it("нічого не шукали — нічого й не знайдено", () => {
    expect(foundContactTags(tags, view())).toEqual([]);
    expect(foundContactTags(tags, view({ tags: { kind: "untagged" } }))).toEqual([]);
  });
});

describe("фільтр за хештегами", () => {
  const contacts = [
    contact(1, { tags: ["київ"] }),
    contact(2),
    contact(3, { tags: ["київ", "друг"] }),
  ];

  it("«без хештегів» — окремий фільтр, а не порожній тег", () => {
    expect(filterContacts(contacts, view({ tags: { kind: "untagged" } })).map((c) => c.id)).toEqual(
      [2],
    );
  });

  it("кілька тегів вимагають УСІ", () => {
    const both = view({ tags: { kind: "tags", tags: ["київ", "друг"] } });
    expect(filterContacts(contacts, both).map((c) => c.id)).toEqual([3]);
  });

  it("збирає теги за абеткою й без повторів", () => {
    expect(collectContactTags(contacts)).toEqual(["друг", "київ"]);
  });
});

describe("сортування", () => {
  const contacts = [
    contact(1, { name: "б", createdAt: "2026-09-10 10:00:00", updatedAt: "2026-09-17 10:00:00" }),
    contact(2, { name: "а", createdAt: "2026-09-16 10:00:00", updatedAt: "2026-09-16 10:00:00" }),
    contact(3, { name: "в", createdAt: "2026-09-18 10:00:00", updatedAt: "2026-09-18 10:00:00" }),
  ];

  it("типово — найсвіжіше змінені згори", () => {
    expect(filterContacts(contacts, view()).map((c) => c.id)).toEqual([3, 1, 2]);
  });

  it("уміє за часом створення в обидва боки", () => {
    expect(filterContacts(contacts, view({ sort: "created-desc" })).map((c) => c.id)).toEqual([
      3, 2, 1,
    ]);
    expect(filterContacts(contacts, view({ sort: "created-asc" })).map((c) => c.id)).toEqual([
      1, 2, 3,
    ]);
  });

  it("«за іменем» сортує українською абеткою", () => {
    expect(filterContacts(contacts, view({ sort: "name" })).map((c) => c.name)).toEqual([
      "а",
      "б",
      "в",
    ]);
  });

  it("не чіпає вхідний масив", () => {
    const original = [contact(1), contact(2)];
    filterContacts(original, view({ sort: "name" }));
    expect(original.map((c) => c.id)).toEqual([1, 2]);
  });
});

describe("групування", () => {
  const contacts = [
    contact(1, { updatedAt: stamp(0) }),
    contact(2, { updatedAt: stamp(1) }),
    contact(3, { updatedAt: stamp(3) }),
    contact(4, { updatedAt: stamp(15) }),
    contact(5, { updatedAt: stamp(200) }),
  ];

  it("за днями: від «Сьогодні» до «Давніше», без порожніх груп", () => {
    const groups = buildContactGroups(contacts, view({ groupBy: "day" }), NOW);

    expect(groups.map((g) => g.label)).toEqual([
      "Сьогодні",
      "Вчора",
      "Раніше цього тижня",
      "Раніше цього місяця",
      "Давніше",
    ]);
    expect(groups.map((g) => g.contacts.map((c) => c.id))).toEqual([[1], [2], [3], [4], [5]]);
  });

  it("межа «Вчора» рахується від опівночі, а не від 24 годин", () => {
    const lastNight = contact(9, { updatedAt: stamp(1, 23) });
    expect(buildContactGroups([lastNight], view({ groupBy: "day" }), NOW)[0].label).toBe("Вчора");
  });

  it("за хештегами: контакт із двома тегами стоїть у кожній своїй групі", () => {
    const tagged = [
      contact(1, { tags: ["київ"] }),
      contact(2, { tags: ["київ", "друг"] }),
      contact(3),
    ];
    const groups = buildContactGroups(tagged, view({ groupBy: "tag" }), NOW);

    expect(groups.map((g) => g.label)).toEqual(["#друг", "#київ", "Без хештегів"]);
    expect(groups[0].contacts.map((c) => c.id)).toEqual([2]);
    expect(groups[1].contacts.map((c) => c.id)).toEqual([1, 2]);
    expect(groups[2].contacts.map((c) => c.id)).toEqual([3]);
  });

  it("«без груп» — один список, і він порожній, коли нічого не знайшлось", () => {
    expect(
      buildContactGroups(contacts, view({ groupBy: "none", query: "такого-нема" }), NOW),
    ).toEqual([]);
    expect(buildContactGroups(contacts, view({ groupBy: "none" }), NOW)[0].contacts).toHaveLength(
      5,
    );
  });

  it("пошук діє всередині груп, а не лише на весь список", () => {
    const groups = buildContactGroups(contacts, view({ groupBy: "day", query: "Контакт 5" }), NOW);

    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Давніше");
  });
});

describe("чипи вибраного", () => {
  it("типовий вигляд — жодного чипа", () => {
    expect(contactViewChips(view())).toEqual([]);
  });

  it("кожен вибір — свій чип із тим, що саме він вертає", () => {
    const chips = contactViewChips(
      view({ query: "київ", tags: { kind: "tags", tags: ["друг"] }, sort: "name" }),
    );

    expect(chips.map((chip) => chip.key)).toEqual(["query", "tag:друг", "sort"]);
    expect(chips.map((chip) => chip.label)).toEqual(["«київ»", "#друг", "За іменем"]);
    // Скидання чипа чіпає РІВНО один вибір — решта мусить лишитись як була.
    expect(chips.map((chip) => Object.keys(chip.reset))).toEqual([["query"], ["tags"], ["sort"]]);
  });

  it("«без хештегів» каже саме про контакти, а не про нотатки", () => {
    const [chip] = contactViewChips(view({ tags: { kind: "untagged" } }));

    expect(chip.action).toBe("Показати й контакти з хештегами");
    expect(chip.label).toBe("Без хештегів");
  });

  it("скидання чипа вертає типовий вибір, а не порожнечу", () => {
    const [chip] = contactViewChips(view({ sort: "name" }));

    expect({ ...view(), ...chip.reset }).toEqual(DEFAULT_CONTACTS_VIEW);
  });
});
