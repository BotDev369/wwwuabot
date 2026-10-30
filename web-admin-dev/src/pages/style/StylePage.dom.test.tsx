// @vitest-environment jsdom
/**
 * Інвентар вигляду: токени, кирпичики й класи — з каталогу, а не з розмітки.
 *
 * Перевіряємо справжні дані CSS, перемикання вкладок і пошук по всіх трьох
 * списках.
 *
 * @module web-admin-dev/src/pages/style/StylePage.dom.test
 */

import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StylePage } from "./StylePage";

function renderPage() {
  return render(<StylePage />);
}

/** Вкладка за підписом — кнопки смуги вкладок кирпичика `.wb-tabs`. */
function tab(label: string): HTMLElement {
  return screen.getByRole("tab", { name: label });
}

describe("сторінка «Стиль»", () => {
  it("називає джерело стилів і показує зведення з каталогу", () => {
    renderPage();

    expect(screen.getByText(/packages\/shared\/src\/styles/)).toBeTruthy();
    expect(screen.getByText("токенів")).toBeTruthy();
    expect(screen.getByText("класів")).toBeTruthy();
    expect(screen.getByText("CSS-файлів")).toBeTruthy();
  });

  it("у списку токенів є токен із трьома шарами й поточним значенням", () => {
    renderPage();

    // `--accent` має світле значення, темне й палітру — саме три шари.
    expect(screen.getByText("--accent")).toBeTruthy();
    expect(screen.getByText("--bg-page")).toBeTruthy();
    expect(screen.getAllByText("світла").length).toBeGreaterThan(0);
    expect(screen.getAllByText("темна").length).toBeGreaterThan(0);
  });

  it("кирпичики — справжня розмітка: кнопка, поле й футер на місці", () => {
    renderPage();
    fireEvent.click(tab("Кирпичики"));

    expect(screen.getByText("Чотири ролі кнопки")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Зберегти" })).toBeTruthy();
    expect(screen.getByText("Футер застосунку")).toBeTruthy();
    expect(screen.getByText(".wb-tabbar-item--active")).toBeTruthy();
  });

  it("перелік класів приходить із CSS — файл і клас видно", () => {
    renderPage();
    fireEvent.click(tab("Класи"));

    expect(screen.getByText("components.css")).toBeTruthy();
    // `wb-btn` рендерить спільний код, тож він мусить бути в переліку.
    expect(screen.getAllByText(/wb-btn$/).length).toBeGreaterThan(0);
  });

  it("пошук звужує всі три списки", () => {
    renderPage();

    const input = screen.getByLabelText("Пошук по інвентарю вигляду");
    // `--sp-4` є токеном і не є частиною жодного класу.
    fireEvent.change(input, { target: { value: "--sp-4" } });

    expect(screen.getByText("--sp-4")).toBeTruthy();
    expect(screen.queryByText("--bg-page")).toBeNull();

    // У класах такого імені немає — список порожній, а не весь.
    fireEvent.click(tab("Класи"));
    expect(screen.getByText("Нічого не знайдено.")).toBeTruthy();

    // А клас знаходиться в своєму файлі — разом із ним.
    fireEvent.change(input, { target: { value: "wb-btn-primary" } });
    expect(screen.getByText("components.css")).toBeTruthy();

    fireEvent.change(input, { target: { value: "zzz-нічого" } });
    expect(screen.getByText("Нічого не знайдено.")).toBeTruthy();
  });
});
