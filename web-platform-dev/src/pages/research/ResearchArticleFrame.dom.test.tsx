// @vitest-environment jsdom
/**
 * Рамка читання: назад у розділ, підпис блоку й сусіди.
 *
 * @module web-platform-dev/src/pages/research/ResearchArticleFrame
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/** Ті самі ключі, що в рядку `research`: рамка читає їх, а не літерали. */
const texts = vi.hoisted(() => ({
  "research.article.back": "Дослідження",
  "research.article.aria": "Далі в дослідженні",
  "research.article.prev": "Назад",
  "research.article.next": "Далі",
}));

vi.mock("../screen-texts/useScreenTexts", () => ({
  useScreenTexts: () => ({ texts, ready: true }),
}));

vi.mock("./useResearchCatalog", () => ({
  useResearchCatalog: () => ({
    loading: false,
    catalog: {
      title: "Дослідження: тест",
      slug: "viruvannia",
      updatedAt: "",
      blocks: [
        {
          id: "a1",
          slug: "viruvannia-a1",
          group: "A",
          groupTitle: "Масштаб",
          title: "Сто відсотків",
          oneLiner: "",
          dataDate: "",
          publishedDate: "",
          dataStatus: "verified",
          readingTime: 7,
          keyFigures: [],
        },
        {
          id: "a2",
          slug: "viruvannia-a2",
          group: "A",
          groupTitle: "Масштаб",
          title: "Друга сторінка",
          oneLiner: "",
          dataDate: "",
          publishedDate: "",
          dataStatus: "verified",
          readingTime: 5,
          keyFigures: [],
        },
      ],
    },
  }),
}));

import { ResearchArticleFrame } from "./ResearchArticleFrame";

describe("ResearchArticleFrame", () => {
  it("показує, у якому розділі й блоці людина", () => {
    render(
      <MemoryRouter>
        <ResearchArticleFrame slug="viruvannia-a2">
          <p>Текст блоку</p>
        </ResearchArticleFrame>
      </MemoryRouter>,
    );

    expect(screen.getByText("Дослідження")).toBeTruthy();
    expect(screen.getByText("Масштаб · A2")).toBeTruthy();
    expect(screen.getByText("Текст блоку")).toBeTruthy();
  });

  it("дає перехід до попереднього блоку", () => {
    render(
      <MemoryRouter>
        <ResearchArticleFrame slug="viruvannia-a2">
          <p>Текст блоку</p>
        </ResearchArticleFrame>
      </MemoryRouter>,
    );

    expect(screen.getByText("Назад")).toBeTruthy();
    expect(screen.getByText("Сто відсотків")).toBeTruthy();
    expect(screen.queryByText("Далі")).toBeNull();
  });

  it("без каталогу рамка не вигадує сусідів", () => {
    render(
      <MemoryRouter>
        <ResearchArticleFrame slug="viruvannia-z9">
          <p>Текст блоку</p>
        </ResearchArticleFrame>
      </MemoryRouter>,
    );

    expect(screen.getByText("Дослідження")).toBeTruthy();
    expect(screen.queryByText("Назад")).toBeNull();
  });
});
