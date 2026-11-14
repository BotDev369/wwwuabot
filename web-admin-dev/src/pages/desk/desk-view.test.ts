/**
 * Чиста частина макета «Стола»: тон бейджа й відбір тем.
 *
 * @module web-admin-dev/src/pages/desk/desk-view.test
 */

import { describe, expect, it } from "vitest";
import { countByGroup, filterThreads, statusTone, type DeskThread } from "./desk-view";

function thread(overrides: Partial<DeskThread> = {}): DeskThread {
  return {
    id: "a",
    group: "plan",
    subgroup: "Адмінка",
    title: "Тема",
    status: "open",
    tags: ["desk"],
    updated: "14.11 10:00",
    entries: [],
    ...overrides,
  };
}

const THREADS: DeskThread[] = [
  thread({ id: "a", title: "Макет стола", status: "waitingSerhii", tags: ["ui"], group: "plan" }),
  thread({
    id: "b",
    title: "Бакет для файлів",
    status: "waitingBuffy",
    tags: ["r2", "files"],
    group: "task",
    entries: [
      { author: "serhii", when: "14.11 09:12", kind: "question", body: "Питань", files: [] },
    ],
  }),
  thread({ id: "c", title: "Контраст кнопок", status: "doing", tags: ["css"], group: "plan" }),
  thread({ id: "d", title: "Старий звіт", status: "done", tags: ["ci"], group: "question" }),
];

const ids = (list: DeskThread[]): string[] => list.map((item) => item.id);

describe("statusTone", () => {
  it("кожен статус має свій тон, невідомий — нейтральний", () => {
    expect(statusTone("done")).toBe("wb-badge-green");
    expect(statusTone("waitingSerhii")).toBe("wb-badge-yellow");
    expect(statusTone("waitingBuffy")).toBe("wb-badge-yellow");
    expect(statusTone("doing")).toBe("wb-badge-accent");
    expect(statusTone("open")).toBe("wb-badge-neutral");
    expect(statusTone("щось-нове")).toBe("wb-badge-neutral");
  });
});

describe("filterThreads", () => {
  it("група `all` і порожній пошук лишають усе", () => {
    expect(ids(filterThreads(THREADS, { group: "all", status: "all", query: "  " }))).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("група й статус звужують список разом", () => {
    expect(ids(filterThreads(THREADS, { group: "plan", status: "all", query: "" }))).toEqual([
      "a",
      "c",
    ]);
    expect(
      ids(filterThreads(THREADS, { group: "all", status: "waitingBuffy", query: "" })),
    ).toEqual(["b"]);
    expect(ids(filterThreads(THREADS, { group: "plan", status: "doing", query: "" }))).toEqual([
      "c",
    ]);
  });

  it("пошук дивиться в заголовок, підгрупу, теги й текст записів", () => {
    const find = (query: string) =>
      ids(filterThreads(THREADS, { group: "all", status: "all", query }));

    expect(find("контраст")).toEqual(["c"]);
    expect(find("R2")).toEqual(["b"]);
    // Підгрупа в тестових темах спільна, тож збіг дають усі чотири.
    expect(find("адмінка")).toEqual(["a", "b", "c", "d"]);
    expect(find("Питань")).toEqual(["b"]);
  });

  it("пошук без збігів дає порожньо", () => {
    expect(filterThreads(THREADS, { group: "all", status: "all", query: "нічого" })).toEqual([]);
  });
});

describe("countByGroup", () => {
  it("`all` рахує всі, решта — лише свою групу", () => {
    expect(countByGroup(THREADS, "all")).toBe(4);
    expect(countByGroup(THREADS, "plan")).toBe(2);
    expect(countByGroup(THREADS, "question")).toBe(1);
  });

  it("порожня група — нуль, а не помилка", () => {
    expect(countByGroup(THREADS, "debt")).toBe(0);
  });
});
