// @vitest-environment jsdom
/**
 * Поля схеми: тип визначає контрол, а значення доходить до `onChange` тим типом,
 * який чекає блок — рядок, число, прапорець чи список.
 *
 * @module web-admin-dev/src/features/page-builder/SchemaField.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SchemaField } from "./SchemaField";

vi.mock("./ArrayFieldEditor", () => ({
  ArrayFieldEditor: ({ fieldKey }: { fieldKey: string }) => (
    <div data-testid="array-editor">{fieldKey}</div>
  ),
}));

describe("SchemaField", () => {
  it("без схеми малює текстове поле на кожен ключ і розбирає JSON", () => {
    const onChange = vi.fn();
    render(<SchemaField props={{ count: 3 }} schema={undefined} onChange={onChange} />);

    const input = screen.getByDisplayValue("3");
    fireEvent.change(input, { target: { value: "7" } });

    expect(onChange).toHaveBeenCalledWith("count", 7);
  });

  it("не-JSON лишається рядком, а не зникає", () => {
    const onChange = vi.fn();
    render(<SchemaField props={{ title: "" }} schema={undefined} onChange={onChange} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "просто текст" } });

    expect(onChange).toHaveBeenCalledWith("title", "просто текст");
  });

  it("прапорець віддає `checked`, а не рядок", () => {
    const onChange = vi.fn();
    render(
      <SchemaField
        props={{ visible: false }}
        schema={{ properties: { visible: { type: "boolean", title: "Видимий" } } }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox"));

    expect(onChange).toHaveBeenCalledWith("visible", true);
  });

  it("перелік стає селектом зі значенням за замовчуванням", () => {
    const onChange = vi.fn();
    render(
      <SchemaField
        props={{}}
        schema={{
          properties: {
            align: { type: "string", enum: ["left", "center"], default: "center", title: "Вирів" },
          },
        }}
        onChange={onChange}
      />,
    );

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("center");

    fireEvent.change(select, { target: { value: "left" } });
    expect(onChange).toHaveBeenCalledWith("align", "left");
  });

  it("число віддає `Number`, а порожнє поле — `undefined`", () => {
    const onChange = vi.fn();
    render(
      <SchemaField
        props={{ size: 2 }}
        schema={{ properties: { size: { type: "number", title: "Розмір" } } }}
        onChange={onChange}
      />,
    );

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "5" } });
    expect(onChange).toHaveBeenCalledWith("size", 5);

    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith("size", undefined);
  });

  it("масив віддає редактору списку, а не текстове поле", () => {
    render(
      <SchemaField
        props={{ items: [] }}
        schema={{ properties: { items: { type: "array", title: "Пункти" } } }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("array-editor").textContent).toBe("items");
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("рядок без переліку лишається текстовим полем із підписом зі схеми", () => {
    const onChange = vi.fn();
    render(
      <SchemaField
        props={{ title: "Заголовок" }}
        schema={{ properties: { title: { type: "string", title: "Назва блоку" } } }}
        onChange={onChange}
      />,
    );

    expect(screen.getByText("Назва блоку")).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Нове" } });
    expect(onChange).toHaveBeenCalledWith("title", "Нове");
  });
});
