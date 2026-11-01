// @vitest-environment jsdom
/**
 * Модалка «Додати блок»: пошук, категорії, сумісність із зоною.
 *
 * Список блоків підмінений трьома описами: тест перевіряє поведінку фільтрів, а
 * не вміст реального каталогу, який змінюється окремо від модалки.
 *
 * @module web-admin-dev/src/features/page-builder/AddBlockModal.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@wwwuabot/shared/constants/block-definitions", () => ({
  BLOCK_DEFINITIONS: [
    {
      type: "text",
      label: "Текст",
      description: "Абзац тексту",
      category: "content",
      compatibleZones: ["main"],
      icon: "blocks",
    },
    {
      type: "link",
      label: "Посилання",
      description: "Кнопка переходу",
      category: "action",
      compatibleZones: [],
    },
    {
      type: "image",
      label: "Картинка",
      description: "Зображення",
      category: "media",
      compatibleZones: ["main", "header"],
    },
  ],
}));

const { AddBlockModal } = await import("./AddBlockModal");

const onSelect = vi.fn();
const onClose = vi.fn();

function setup(targetZone: "main" | "header" | null = null) {
  onSelect.mockClear();
  onClose.mockClear();
  const view = render(
    <AddBlockModal onSelect={onSelect} onClose={onClose} targetZone={targetZone} />,
  );
  return view;
}

describe("AddBlockModal", () => {
  it("показує всі блоки без власних стилів", () => {
    const { container } = setup();

    expect(screen.getByText("Текст")).toBeTruthy();
    expect(screen.getByText("Посилання")).toBeTruthy();
    expect(screen.getByText("Картинка")).toBeTruthy();
    expect(container.querySelectorAll('[class*="pb-"][style]')).toHaveLength(0);
  });

  it("шукає за назвою, описом і типом", () => {
    setup();

    fireEvent.change(screen.getByPlaceholderText("Пошук блоку…"), {
      target: { value: "переходу" },
    });
    expect(screen.getByText("Посилання")).toBeTruthy();
    expect(screen.queryByText("Текст")).toBeNull();
  });

  it("порожній результат пояснює себе", () => {
    setup();

    fireEvent.change(screen.getByPlaceholderText("Пошук блоку…"), {
      target: { value: "нічого-такого" },
    });
    expect(screen.getByText("Нічого не знайдено")).toBeTruthy();
  });

  it("пігулка категорії звужує список, «Усі» повертає його", () => {
    setup();

    fireEvent.click(screen.getByText("action"));
    expect(screen.getByText("Посилання")).toBeTruthy();
    expect(screen.queryByText("Картинка")).toBeNull();

    fireEvent.click(screen.getByText("Усі"));
    expect(screen.getByText("Картинка")).toBeTruthy();
  });

  it("показує лише блоки, сумісні з цільовою зоною", () => {
    setup("header");

    expect(screen.getByText(/Додати блок → Header/)).toBeTruthy();
    expect(screen.getByText("Картинка")).toBeTruthy();
    // Порожній `compatibleZones` означає «будь-яка зона», а не «жодна».
    expect(screen.getByText("Посилання")).toBeTruthy();
    expect(screen.queryByText("Текст")).toBeNull();
  });

  it("клік по картці віддає тип блоку", () => {
    setup();

    fireEvent.click(screen.getByText("Текст"));
    expect(onSelect).toHaveBeenCalledWith("text");
  });

  it("Escape закриває модалку", () => {
    setup();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
