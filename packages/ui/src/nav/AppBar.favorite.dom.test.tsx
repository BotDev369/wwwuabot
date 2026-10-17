// @vitest-environment jsdom
/**
 * Серце в хедері: **залите**, коли сторінка в обраному.
 *
 * Контур акцентного кольору виглядав тією самою кнопкою, лише пофарбованою —
 * стан доводилось згадувати. Тому перевіряється саме гліф: залитий шлях
 * (`heart-solid`) проти контурного (`heart`), а не лише `aria-pressed`.
 *
 * @module packages/ui/src/nav/AppBar.favorite.dom.test
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_CHROME } from "./screen-chrome";

const state = vi.hoisted(() => ({ liked: false }));

vi.mock("../favorites/useFavorite", () => ({
  useFavorite: () => ({
    liked: state.liked,
    failed: false,
    busy: false,
    toggle: vi.fn(),
  }),
}));

const { AppBarView } = await import("./AppBar");

/** Контурне серце й залите — різні шляхи, і саме це тут перевіряється. */
const OUTLINE = "M20.84 4.61";
const FILLED = "M12 21.35";

const CHROME = {
  ...EMPTY_CHROME,
  title: "PageSlay",
  favorite: { kind: "page" as const, targetId: 7 },
};
const ACTIONS = { onBack: () => undefined, onTheme: () => undefined };

beforeEach(() => {
  state.liked = false;
});

describe("серце сторінки", () => {
  it("не в обраному — контур і підпис «Додати в обране»", () => {
    render(<AppBarView chrome={CHROME} {...ACTIONS} />);

    const heart = screen.getByRole("button", { name: "Додати в обране" });
    expect(heart.getAttribute("aria-pressed")).toBe("false");
    expect(heart.innerHTML).toContain(OUTLINE);
    expect(heart.innerHTML).not.toContain(FILLED);
  });

  it("в обраному — **залите** серце, а не пофарбований контур", () => {
    state.liked = true;
    render(<AppBarView chrome={CHROME} {...ACTIONS} />);

    const heart = screen.getByRole("button", { name: "Прибрати з обраного" });
    expect(heart.getAttribute("aria-pressed")).toBe("true");
    expect(heart.innerHTML).toContain(FILLED);
    expect(heart.innerHTML).not.toContain(OUTLINE);
  });
});
