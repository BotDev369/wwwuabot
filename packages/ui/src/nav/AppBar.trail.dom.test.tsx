// @vitest-environment jsdom
/**
 * Хлібний шлях у хедері: він стоїть другим рядком **завжди** — з першого
 * кадру, до прокрутки й після неї. Великий `h1` у контенті його не ховає:
 * інакше хедер одного екрана виглядав би інакше, ніж хедер сусіднього.
 *
 * @module packages/ui/src/nav/AppBar.trail.dom.test
 */

import { act, render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppBarView } from "./AppBar";
import { EMPTY_CHROME } from "./screen-chrome";

// Дані тесту — латиниця: назви екранів тут перевіряють структуру, а не слова
// інтерфейсу (`scripts/check-texts.mjs` рахує кожен український рядок).
const CHROME = { ...EMPTY_CHROME, title: "Page" };

describe("хлібний шлях у хедері", () => {
  it("показує шлях відразу, без прокрутки", () => {
    const { container } = render(<AppBarView chrome={CHROME} />);

    expect(container.querySelector(".wb-appbar__trail")).not.toBeNull();
    expect(container.querySelector(".wb-appbar__crumb--current")?.textContent).toBe("Page");
    // Жодного hero-стану, який тримав би хедер однорядковим.
    expect(container.querySelector(".wb-appbar--hero")).toBeNull();
  });

  it("не ховає шлях ні після прокрутки, ні через великий `h1` у контенті", async () => {
    document.body.appendChild(document.createElement("h1"));

    const { container } = render(<AppBarView chrome={CHROME} />);
    act(() => {
      document.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("resize"));
    });

    await waitFor(() =>
      expect(container.querySelector(".wb-appbar__trail")?.textContent).toBe("Page"),
    );
  });

  it("тримає весь шлях одним рядком", () => {
    const { container } = render(
      <AppBarView
        chrome={{
          ...CHROME,
          ancestors: [
            { label: "Section", href: "/section" },
            { label: "Step", href: "/section/step" },
          ],
          title: "Page",
        }}
      />,
    );

    const crumbs = [...container.querySelectorAll(".wb-appbar__crumb")].map(
      (node) => node.textContent,
    );
    expect(crumbs).toEqual(["Section", "Step", "Page"]);
  });
});
