// @vitest-environment jsdom
/**
 * Заголовок блоку: клік по рядку згортає, клік по назві — перейменовує, а кнопки
 * дій не згортають блок заодно.
 *
 * @module web-admin-dev/src/features/page-builder/BlockEditorHeader.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BlockEditorHeader } from "./BlockEditorHeader";

function header(overrides: Partial<Parameters<typeof BlockEditorHeader>[0]> = {}) {
  const props = {
    collapsed: true,
    displayName: "Перший блок",
    blockType: "text",
    hasConditions: false,
    showConditions: false,
    childrenCount: 0,
    editingName: false,
    nameDraft: "",
    onToggle: vi.fn(),
    onToggleConditions: vi.fn(),
    onRemove: vi.fn(),
    onStartEditName: vi.fn(),
    onNameDraftChange: vi.fn(),
    onCommitName: vi.fn(),
    onCancelEditName: vi.fn(),
    ...overrides,
  };
  render(<BlockEditorHeader {...props} />);
  return props;
}

describe("BlockEditorHeader", () => {
  it("показує назву й тип, коли підпису типу немає", () => {
    header();

    expect(screen.getByText("Перший блок")).toBeTruthy();
    expect(screen.getByText("text")).toBeTruthy();
  });

  it("підпис типу з реєстру перекриває ключ", () => {
    header({ definitionLabel: "Текст" });
    expect(screen.getByText("Текст")).toBeTruthy();
  });

  it("клік по рядку згортає блок", () => {
    const props = header();
    fireEvent.click(screen.getByText("text"));
    expect(props.onToggle).toHaveBeenCalled();
  });

  it("клік по назві починає перейменування і не згортає блок", () => {
    const props = header();
    fireEvent.click(screen.getByText("Перший блок"));

    expect(props.onStartEditName).toHaveBeenCalled();
    expect(props.onToggle).not.toHaveBeenCalled();
  });

  it("у режимі правки поле веде до `onNameDraftChange`, Enter — зберегти, Escape — скасувати", () => {
    const props = header({ editingName: true, nameDraft: "Нова" });
    const input = screen.getByDisplayValue("Нова");

    fireEvent.change(input, { target: { value: "Інша" } });
    expect(props.onNameDraftChange).toHaveBeenCalledWith("Інша");

    fireEvent.keyDown(input, { key: "Enter" });
    expect(props.onCommitName).toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Escape" });
    expect(props.onCancelEditName).toHaveBeenCalled();
  });

  it("кнопка умов не згортає блок", () => {
    const props = header();
    fireEvent.click(screen.getByTitle("Умови показу"));

    expect(props.onToggleConditions).toHaveBeenCalled();
    expect(props.onToggle).not.toHaveBeenCalled();
  });

  it("кнопка видалення не згортає блок", () => {
    const props = header();
    fireEvent.click(screen.getByTitle("Видалити блок"));

    expect(props.onRemove).toHaveBeenCalled();
    expect(props.onToggle).not.toHaveBeenCalled();
  });

  it("значки умов і кількості дітей видно лише тоді, коли є що показати", () => {
    header();
    expect(screen.queryByText("COND")).toBeNull();

    header({ hasConditions: true, childrenCount: 3, collapsed: false });
    expect(screen.getByText("COND")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });
});
