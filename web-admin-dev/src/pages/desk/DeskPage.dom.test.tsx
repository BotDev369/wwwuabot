// @vitest-environment jsdom
/**
 * Макет «Стола» в адмінці: групи, фільтри, стрічка, композер.
 *
 * @module web-admin-dev/src/pages/desk/DeskPage.dom.test
 */

import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { DeskPage } from "./DeskPage";

/** Кнопка теми в середній колонці шукається за заголовком усередині неї. */
function threadButton(title: RegExp): HTMLElement {
  const button = screen
    .getAllByRole("button")
    .find((item) => item.className.includes("desk-thread") && title.test(item.textContent ?? ""));
  if (!button) throw new Error(`немає теми ${title}`);
  return button;
}

describe("DeskPage", () => {
  it("малює групи, теми й стрічку першої теми", () => {
    const { container } = render(<DeskPage />);

    const groups = container.querySelector(".desk-groups") as HTMLElement;
    expect(within(groups).getByText("Усі теми")).toBeTruthy();
    expect(within(groups).getByText("Плани")).toBeTruthy();

    expect(container.querySelectorAll(".desk-thread")).toHaveLength(7);
    // Перша тема відкрита: її заголовок стоїть у шапці справа й у списку.
    expect(container.querySelectorAll(".desk-room-title")).toHaveLength(1);
    expect(container.querySelectorAll(".desk-entry").length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".desk-entry--serhii").length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".desk-entry--buffy").length).toBeGreaterThan(0);
  });

  it("клік по групі лишає тільки її теми", () => {
    const { container } = render(<DeskPage />);

    fireEvent.click(screen.getByText("Плани"));
    const titles = [...container.querySelectorAll(".desk-thread-title")].map(
      (el) => el.textContent,
    );
    expect(titles).toHaveLength(3);
    expect(titles.every((title) => /Стіл|онтраст|R2/.test(title ?? ""))).toBe(true);
  });

  it("чип статусу фільтрує за «чиєю чергою»", () => {
    const { container } = render(<DeskPage />);

    fireEvent.click(screen.getByRole("button", { name: "Чекає на Buffy" }));
    const badges = [...container.querySelectorAll(".desk-thread .wb-badge")].map(
      (el) => el.textContent,
    );
    expect(badges).toHaveLength(2);
    expect(new Set(badges)).toEqual(new Set(["Чекає на Buffy"]));
  });

  it("пошук знаходить тему за тегом і каже, коли нічого немає", () => {
    const { container } = render(<DeskPage />);
    const search = screen.getByLabelText("Пошук теми або тега");

    // «R2» є і в назві теми, і в назві теми про переїзд документації.
    fireEvent.change(search, { target: { value: "r2" } });
    expect(container.querySelectorAll(".desk-thread")).toHaveLength(2);

    fireEvent.change(search, { target: { value: "telegram" } });
    expect(container.querySelectorAll(".desk-thread")).toHaveLength(1);

    fireEvent.change(search, { target: { value: "нічого-нема" } });
    expect(container.querySelectorAll(".desk-thread")).toHaveLength(0);
    expect(screen.getByText("Немає тем за цим фільтром")).toBeTruthy();
  });

  it("вибір теми показує її стрічку й файли", () => {
    const { container } = render(<DeskPage />);

    fireEvent.click(threadButton(/R2-бакет/));

    expect((container.querySelector(".desk-room-title") as HTMLElement).textContent).toBe(
      "R2-бакет для обміну файлами",
    );
    // Автор запису — чип з іменем сторони, а не папка.
    const authors = [...container.querySelectorAll(".desk-entry-author")].map(
      (el) => el.textContent,
    );
    expect(authors).toContain("Buffy");
    expect(container.querySelectorAll(".desk-file").length).toBe(3);
  });

  it("композер додає запис у стрічку й очищається", () => {
    const { container } = render(<DeskPage />);
    const before = container.querySelectorAll(".desk-entry").length;
    const input = screen.getByLabelText("Написати в тему…");

    fireEvent.change(input, { target: { value: "  Перевірка макета  " } });
    fireEvent.click(screen.getByRole("button", { name: "Надіслати" }));

    const entries = [...container.querySelectorAll(".desk-entry-body")].map((el) => el.textContent);
    expect(entries).toContain("Перевірка макета");
    expect(container.querySelectorAll(".desk-entry")).toHaveLength(before + 1);
    expect((input as HTMLTextAreaElement).value).toBe("");
  });

  it("порожнє поле нічого не надсилає, а Cmd+Enter надсилає", () => {
    const { container } = render(<DeskPage />);
    const before = container.querySelectorAll(".desk-entry").length;
    const input = screen.getByLabelText("Написати в тему…");

    fireEvent.click(screen.getByRole("button", { name: "Надіслати" }));
    expect(container.querySelectorAll(".desk-entry")).toHaveLength(before);

    fireEvent.change(input, { target: { value: "Через клавіші" } });
    fireEvent.keyDown(input, { key: "Enter", metaKey: true });
    expect(container.querySelectorAll(".desk-entry")).toHaveLength(before + 1);

    fireEvent.change(input, { target: { value: "Без модифікатора" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(container.querySelectorAll(".desk-entry")).toHaveLength(before + 1);
  });

  it("вид запису змінюється селектом", () => {
    const { container } = render(<DeskPage />);
    const select = screen.getByLabelText("Вид") as HTMLSelectElement;

    fireEvent.change(select, { target: { value: "debt" } });
    fireEvent.change(screen.getByLabelText("Написати в тему…"), { target: { value: "Борг" } });
    fireEvent.click(screen.getByRole("button", { name: "Надіслати" }));

    const kinds = [...container.querySelectorAll(".desk-entry-kind")].map((el) => el.textContent);
    expect(kinds).toContain("Борг");
  });
});
