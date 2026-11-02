/**
 * Каталог дослідження: розділи, сусіди й підписи — те, що бачить розділ.
 *
 * @module @wwwuabot/shared/research
 */

import { describe, expect, it } from "vitest";
import {
  RESEARCH_BLOCK_PREFIX,
  isResearchBlockSlug,
  researchBlockBySlug,
  researchChapters,
  researchNeighbours,
  researchReadingMinutes,
  researchStatusLabel,
  type ResearchBlock,
} from "./index";

function block(
  id: string,
  groupTitle: string,
  overrides: Partial<ResearchBlock> = {},
): ResearchBlock {
  return {
    id,
    slug: `${RESEARCH_BLOCK_PREFIX}${id}`,
    group: groupTitle.slice(0, 1),
    groupTitle,
    title: `Блок ${id}`,
    oneLiner: "",
    dataDate: "2020",
    publishedDate: "",
    dataStatus: "verified",
    readingTime: 5,
    keyFigures: [],
    ...overrides,
  };
}

const BLOCKS = [
  block("a1", "Масштаб"),
  block("a2", "Масштаб"),
  block("b1", "Релігії", { dataStatus: "estimate", readingTime: 3 }),
];

describe("адреса блоку", () => {
  it("префікс відрізняє контентну сторінку дослідження від решти", () => {
    expect(RESEARCH_BLOCK_PREFIX).toBe("viruvannia-");
    expect(isResearchBlockSlug("viruvannia-a1")).toBe(true);
    expect(isResearchBlockSlug("viruvannia")).toBe(false);
    expect(isResearchBlockSlug("card-about")).toBe(false);
  });
});

describe("блок за адресою", () => {
  it("знаходить потрібний", () => {
    expect(researchBlockBySlug(BLOCKS, "viruvannia-a2")?.title).toBe("Блок a2");
  });

  it("невідома адреса — `null`, а не перший-ліпший блок", () => {
    expect(researchBlockBySlug(BLOCKS, "viruvannia-z9")).toBeNull();
  });
});

describe("розділи", () => {
  it("групує блоки й тримає порядок першої появи", () => {
    const chapters = researchChapters(BLOCKS);

    expect(chapters.map((chapter) => chapter.title)).toEqual(["Масштаб", "Релігії"]);
    expect(chapters[0].blocks.map((item) => item.id)).toEqual(["a1", "a2"]);
    expect(chapters[1].group).toBe("Р");
  });

  it("блок без підпису групи не зникає зі змісту", () => {
    const chapters = researchChapters([block("c1", "", { group: "" })]);
    expect(chapters[0].title).toBe("Дослідження");
  });
});

describe("сусіди", () => {
  it("краї не мають сусіда з того боку", () => {
    expect(researchNeighbours(BLOCKS, "viruvannia-a1")).toEqual({
      previous: null,
      next: BLOCKS[1],
    });
    expect(researchNeighbours(BLOCKS, "viruvannia-b1")).toEqual({
      previous: BLOCKS[1],
      next: null,
    });
  });

  it("середина має обох", () => {
    const { previous, next } = researchNeighbours(BLOCKS, "viruvannia-a2");
    expect(previous?.id).toBe("a1");
    expect(next?.id).toBe("b1");
  });

  it("невідомий блок — без сусідів: рамка не веде навмання", () => {
    expect(researchNeighbours(BLOCKS, "viruvannia-z9")).toEqual({ previous: null, next: null });
  });
});

describe("підписи й час", () => {
  it("статус даних перекладається для людини", () => {
    expect(researchStatusLabel("verified")).toBe("Перевірено за джерелом");
    expect(researchStatusLabel("estimate")).toBe("Оцінка");
    expect(researchStatusLabel("doctrinal")).toBe("Доктринальне джерело");
  });

  it("невідомий статус не вигадує підпис", () => {
    expect(researchStatusLabel("")).toBeNull();
    expect(researchStatusLabel("whatever")).toBeNull();
  });

  it("час читання — сума по блоках", () => {
    expect(researchReadingMinutes(BLOCKS)).toBe(13);
    expect(researchReadingMinutes([])).toBe(0);
  });
});
