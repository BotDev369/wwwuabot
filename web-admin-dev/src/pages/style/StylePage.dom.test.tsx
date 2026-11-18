// @vitest-environment jsdom
/**
 * Сторінка «Стиль»: демо-лендінг, таблиця на 60 рядків, перемикач теми.
 *
 * @module web-admin-dev/src/pages/style/StylePage.dom.test
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StylePage } from "./StylePage";

describe("сторінка «Стиль»", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
    localStorage.clear();
  });

  it("показує гасло продукту і каталог ролей", () => {
    render(<StylePage />);

    expect(screen.getByText("ПАЛЯНИЦЯ")).toBeTruthy();
    expect(screen.getByText("Каталог ролей")).toBeTruthy();
    expect(screen.getAllByText("Палітра").length).toBeGreaterThan(0);
  });

  it("рендерить таблицю на 14 стовпців і 60 рядків", () => {
    const { container } = render(<StylePage />);
    const table = container.querySelector(".sc-table");

    expect(table).toBeTruthy();
    expect(table?.querySelectorAll("thead th")).toHaveLength(14);
    expect(table?.querySelectorAll("tbody tr")).toHaveLength(60);
    expect(table?.querySelector("thead th.sc-table-pin")).toBeTruthy();
  });

  it("перемикач теми міняє світлу на темну", () => {
    render(<StylePage />);

    const toggle = screen.getAllByRole("switch", { name: "Тема" })[0];
    fireEvent.click(toggle);

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("модалка відкривається і закривається", () => {
    render(<StylePage />);

    fireEvent.click(screen.getByRole("button", { name: "Відкрити" }));
    expect(screen.getByRole("dialog", { name: "Демо модалки" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Гаразд" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
