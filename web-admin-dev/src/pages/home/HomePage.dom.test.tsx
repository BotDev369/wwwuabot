// @vitest-environment jsdom
/**
 * Головна адмінки — привітальна обкладинка.
 *
 * Перевіряємо те, що легко зламати непомітно: дата українською, рядки
 * з'являються як кирпичики `wb-cover-*` (без приватних `home-*`), а зірочка
 * повертається за курсором — це єдина поведінка сторінки.
 *
 * @module web-admin-dev/src/pages/home/HomePage.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { HomePage } from "./HomePage";

describe("HomePage", () => {
  it("малює дату, привітання й підпис кирпичиками", () => {
    const { container } = render(<HomePage />);

    expect(container.querySelector(".wb-cover")).toBeTruthy();
    expect(container.querySelectorAll(".wb-cover-line")).toHaveLength(4);
    expect(container.querySelector("[class*='home-']")).toBeNull();
    expect(screen.getByRole("heading", { name: "Привіт, Сергій." })).toBeTruthy();
    expect(screen.getByText(/напарник у всій цій пригоді/)).toBeTruthy();
  });

  it("пише дату українською, а не в системному форматі", () => {
    render(<HomePage />);
    const date = document.querySelector(".wb-cover-date");
    expect(date?.textContent ?? "").toMatch(/^[^,]+, \d{1,2} [^\d]+ \d{4}$/);
  });

  it("повертає зірочку за курсором", () => {
    const { container } = render(<HomePage />);
    const cover = container.querySelector(".wb-cover") as HTMLElement;
    const star = container.querySelector(".wb-cover-star") as HTMLElement;

    /* `getBoundingClientRect` у jsdom нульовий — даємо реальну геометрію,
       інакше кут завжди 180° і перевірка нічого не доводить. */
    vi.spyOn(cover, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.mouseMove(cover, { clientX: 200, clientY: 50 });
    expect(star.style.transform).toBe("rotate(0deg)");

    fireEvent.mouseMove(cover, { clientX: 100, clientY: 100 });
    expect(star.style.transform).toBe("rotate(90deg)");
  });
});
