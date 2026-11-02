// @vitest-environment jsdom
/**
 * Картка теми: палітра на ній, підпису немає, дотик застосовує тему.
 *
 * @module packages/shared/src/components/theme/ThemeCard.test
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { themeById } from "../../styles/registry";
import { ThemeCard } from "./ThemeCard";

const paper = themeById("paper");

describe("ThemeCard", () => {
  it("ставить палітру своєї теми на картку", () => {
    const { container } = render(<ThemeCard theme={paper} onApply={() => {}} />);

    expect(container.querySelector(".wb-theme-card")?.getAttribute("data-theme")).toBe("paper");
  });

  it("не показує ні назви, ні опису — вигляд і є доказом", () => {
    render(<ThemeCard theme={paper} onApply={() => {}} />);

    expect(screen.queryByText("Папір")).toBeNull();
    expect(screen.queryByText(paper.hint)).toBeNull();
  });

  it("показує всі шість кольорів даних і три статуси", () => {
    const { container } = render(<ThemeCard theme={paper} onApply={() => {}} />);

    expect(container.querySelectorAll(".wb-theme-card-bar")).toHaveLength(6);
    expect(container.querySelectorAll(".wb-theme-card-dot")).toHaveLength(3);
  });

  it("називає тему для читача екрана й каже, чи вона обрана", () => {
    render(<ThemeCard theme={paper} applied onApply={() => {}} />);

    const button = screen.getByRole("button", { name: "Тема «Папір»" });
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.querySelector(".wb-theme-card-on")).not.toBeNull();
  });

  it("необрана картка не має позначки", () => {
    render(<ThemeCard theme={paper} onApply={() => {}} />);

    const button = screen.getByRole("button", { name: "Тема «Папір»" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.querySelector(".wb-theme-card-on")).toBeNull();
  });

  it("дотик застосовує тему", () => {
    const onApply = vi.fn();
    render(<ThemeCard theme={paper} onApply={onApply} />);

    fireEvent.click(screen.getByRole("button", { name: "Тема «Папір»" }));

    expect(onApply).toHaveBeenCalledTimes(1);
  });
});
