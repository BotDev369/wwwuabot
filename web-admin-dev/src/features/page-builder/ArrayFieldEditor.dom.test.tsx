// @vitest-environment jsdom
/**
 * Редактор списку об'єктів: форма, JSON-режим і пункти без об'єктів.
 *
 * Редактор віддає назовні рівно те, що має зберегтись: масив зі зміненим
 * пунктом, новий пункт із типовими значеннями схеми, а в JSON-режимі — розібране
 *
 * @module web-admin-dev/src/features/page-builder/ArrayFieldEditor.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ArrayFieldEditor } from "./ArrayFieldEditor";

const OBJECT_SCHEMA = {
  items: {
    type: "object",
    properties: {
      url: { type: "string", title: "URL" },
      kind: { enum: ["a", "b"], default: "a" },
      wide: { type: "boolean" },
    },
  },
};

const onChange = vi.fn();

function setup(propSchema: Record<string, unknown>, currentValue: unknown) {
  onChange.mockClear();
  const view = render(
    <ArrayFieldEditor
      fieldKey="links"
      title="Посилання"
      propSchema={propSchema}
      currentValue={currentValue}
      onChange={onChange}
    />,
  );
  return view;
}

describe("ArrayFieldEditor", () => {
  it("показує пункти й лічить їх у підписі", () => {
    const { container } = setup(OBJECT_SCHEMA, [{ url: "https://a.example", kind: "b" }]);

    expect(screen.getByText("Посилання (1)")).toBeTruthy();
    expect((screen.getByTitle("URL") as HTMLInputElement).value).toBe("https://a.example");
    expect(container.querySelectorAll('[class*="pb-"][style]')).toHaveLength(0);
  });

  it("правка поля міняє саме свій пункт", () => {
    setup(OBJECT_SCHEMA, [{ url: "a" }, { url: "b" }]);

    fireEvent.change(screen.getAllByTitle("URL")[1], { target: { value: "c" } });
    expect(onChange).toHaveBeenCalledWith("links", [{ url: "a" }, { url: "c" }]);
  });

  it("вибір із переліку віддає значення", () => {
    setup(OBJECT_SCHEMA, [{ url: "a" }]);

    fireEvent.change(screen.getAllByTitle("kind")[0], { target: { value: "b" } });
    expect(onChange).toHaveBeenCalledWith("links", [{ url: "a", kind: "b" }]);
  });

  it("новий пункт приходить із типовими значеннями схеми", () => {
    setup(OBJECT_SCHEMA, []);

    fireEvent.click(screen.getByText("+ Додати пункт"));
    expect(onChange).toHaveBeenCalledWith("links", [{ url: "", kind: "a", wide: false }]);
  });

  it("видалення прибирає пункт за індексом", () => {
    setup(OBJECT_SCHEMA, [{ url: "a" }, { url: "b" }]);

    fireEvent.click(screen.getAllByTitle("Видалити пункт")[0]);
    expect(onChange).toHaveBeenCalledWith("links", [{ url: "b" }]);
  });

  it("JSON-режим віддає розібраний масив", () => {
    setup(OBJECT_SCHEMA, [{ url: "a" }]);

    fireEvent.click(screen.getByTitle("Редагувати як JSON"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: '[{"url":"z"}]' } });
    expect(onChange).toHaveBeenCalledWith("links", [{ url: "z" }]);
  });

  it("недорозібраний JSON лишається текстом, а не падінням", () => {
    setup(OBJECT_SCHEMA, []);

    fireEvent.click(screen.getByTitle("Редагувати як JSON"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "[{oops" } });
    expect(onChange).toHaveBeenCalledWith("links", "[{oops");
  });

  it("список не-об'єктів одразу живе в JSON-режимі", () => {
    setup({ items: { type: "string" } }, ["a"]);

    expect(screen.getByText("Посилання")).toBeTruthy();
    expect(screen.queryByText("+ Додати пункт")).toBeNull();
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe('[\n  "a"\n]');
  });
});
