// @vitest-environment jsdom
/**
 * Інвентар вигляду: токени, кирпичики й класи — з каталогу, а не з розмітки.
 *
 * Каталог сторінка забирає ресурсом, тож перевіряємо і стан завантаження, і
 * справжні дані CSS, і пошук по всіх трьох списках.
 *
 * @module web-admin-dev/src/pages/style/StylePage.dom.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import catalog from "@wwwuabot/shared/styles/catalog.json";
import { StylePage } from "./StylePage";

/** Каталог як статичний ресурс: саме так його віддає збірка. */
function serveCatalog(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(catalog), { status: 200 })),
  );
}

/** Вкладка за підписом — кнопки смуги вкладок кирпичика `.wb-tabs`. */
function tab(label: string): HTMLElement {
  return screen.getByRole("tab", { name: label });
}

async function renderPage(): Promise<void> {
  render(<StylePage />);
  await screen.findByText("токенів");
}

describe("сторінка «Стиль»", () => {
  beforeEach(() => {
    serveCatalog();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("спершу показує стан завантаження, а тоді зведення з каталогу", async () => {
    render(<StylePage />);

    expect(screen.getByText("Завантажую каталог вигляду…")).toBeTruthy();
    expect(await screen.findByText(/packages\/shared\/src\/styles/)).toBeTruthy();
    expect(screen.getByText("класів")).toBeTruthy();
    expect(screen.getByText("CSS-файлів")).toBeTruthy();
  });

  it("каже про помилку, якщо каталог не прийшов", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 500 })),
    );

    render(<StylePage />);

    expect(await screen.findByText(/не завантажився/)).toBeTruthy();
  });

  it("у списку токенів є токен із трьома шарами й поточним значенням", async () => {
    await renderPage();

    // `--accent` має світле значення, темне й палітру — саме три шари.
    expect(screen.getByText("--accent")).toBeTruthy();
    expect(screen.getByText("--bg-page")).toBeTruthy();
    expect(screen.getAllByText("світла").length).toBeGreaterThan(0);
    expect(screen.getAllByText("темна").length).toBeGreaterThan(0);
  });

  it("кирпичики — справжня розмітка: кнопка, поле й футер на місці", async () => {
    await renderPage();
    fireEvent.click(tab("Кирпичики"));

    expect(screen.getByText("Чотири ролі кнопки")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Зберегти" })).toBeTruthy();
    expect(screen.getByText("Футер застосунку")).toBeTruthy();
    expect(screen.getByText(".wb-tabbar-item--active")).toBeTruthy();
  });

  it("перелік класів приходить із CSS — файл і клас видно", async () => {
    await renderPage();
    fireEvent.click(tab("Класи"));

    expect(screen.getByText("components.css")).toBeTruthy();
    expect(screen.getByText(/Усього класів у CSS/)).toBeTruthy();
    // `wb-btn` рендерить спільний код, тож він мусить бути в переліку.
    expect(screen.getAllByText(/wb-btn$/).length).toBeGreaterThan(0);
  });

  it("пошук звужує всі три списки", async () => {
    await renderPage();

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
