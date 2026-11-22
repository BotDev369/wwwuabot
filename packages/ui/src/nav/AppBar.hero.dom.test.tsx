// @vitest-environment jsdom
/**
 * Hero-режим хедера: поки великий `h1` видно, хедер однорядковий; коли назва
 * йде під нього, стек стає другим рядком хедера — як на будь-якій сторінці без
 * `h1`. Без `h1` назва мусить лишитись у хедері одразу — інакше екран узагалі
 * без назви.
 *
 * @module packages/ui/src/nav/AppBar.hero.dom.test
 */

import { act, render, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { AppBarView } from "./AppBar";
import { EMPTY_CHROME } from "./screen-chrome";

// Дані тесту — латиниця: назви екранів тут перевіряють структуру, а не слова
// інтерфейсу (`scripts/check-texts.mjs` рахує кожен український рядок).
const CHROME = { ...EMPTY_CHROME, title: "Page", titleMode: "hero" as const };

function rect(bottom: number): DOMRect {
  return {
    bottom,
    top: 0,
    height: bottom,
    left: 0,
    right: 0,
    width: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect;
}

/**
 * Низ елемента для `getBoundingClientRect`: у jsdom усі прямокутники нульові,
 * тож без цього «під хедером» ніколи не настає. Ставимо на прототип — сам
 * елемент це поле перевизначити не дає.
 */
const bottoms = new WeakMap<Element, number>();
const original = HTMLElement.prototype.getBoundingClientRect;

beforeAll(() => {
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement): DOMRect {
    return rect(bottoms.get(this) ?? 0);
  };
});

afterAll(() => {
  HTMLElement.prototype.getBoundingClientRect = original;
});

function stubBox(element: Element, bottom: number): void {
  bottoms.set(element, bottom);
}

afterEach(() => {
  document.querySelectorAll("[data-screen-title]").forEach((node) => node.remove());
});

describe("стек хедера в hero-режимі", () => {
  it("без великого `h1` назва лишається в хедері одразу", async () => {
    const { container } = render(<AppBarView chrome={CHROME} />);

    await waitFor(() => expect(container.querySelector(".wb-appbar__trail")).not.toBeNull());
    expect(container.querySelector(".wb-appbar__crumb--current")?.textContent).toBe("Page");
    // Жодної окремої плашки: рядок лежить у хедері, як на «Магазинах».
    expect(container.querySelector(".wb-appbar--hero")).not.toBeNull();
  });

  it("показує рядок у хедері, коли `h1` пішов під нього, і прибирає назад", async () => {
    const title = document.createElement("h1");
    title.setAttribute("data-screen-title", "");
    document.body.appendChild(title);

    const { container } = render(<AppBarView chrome={CHROME} />);
    const header = container.querySelector("header");
    if (!header) throw new Error("header not rendered");
    stubBox(header, 64);
    stubBox(title, 300);

    act(() => {
      document.dispatchEvent(new Event("scroll"));
    });
    await waitFor(() => expect(container.querySelector(".wb-appbar__trail")).toBeNull());

    // `h1` поїхав під хедер — назва стає другим рядком хедера.
    stubBox(title, 20);
    act(() => {
      document.dispatchEvent(new Event("scroll"));
    });
    await waitFor(() =>
      expect(container.querySelector(".wb-appbar__trail")?.textContent).toBe("Page"),
    );

    // Прокрутили назад — рядок знову прибрано, хедер однорядковий.
    stubBox(title, 300);
    act(() => {
      document.dispatchEvent(new Event("scroll"));
    });
    await waitFor(() => expect(container.querySelector(".wb-appbar__trail")).toBeNull());
  });

  it("тримає всі рівні шляху окремими рядками", async () => {
    const { container } = render(
      <AppBarView chrome={{ ...CHROME, ancestors: ["Section", "Step"], title: "Page" }} />,
    );

    await waitFor(() => expect(container.querySelector(".wb-appbar__trail")).not.toBeNull());
    const crumbs = [...container.querySelectorAll(".wb-appbar__crumb")].map(
      (node) => node.textContent,
    );
    expect(crumbs).toEqual(["Section", "Step", "Page"]);
  });
});
