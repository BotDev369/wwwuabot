// @vitest-environment jsdom
/**
 * Повноекранний конструктор: розбір `page_data`, запис назад і кнопки виходу.
 *
 * @module web-admin-dev/src/pages/scenarios/FullscreenBuilder.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FullscreenBuilder } from "./FullscreenBuilder";

vi.mock("../../features/page-builder/PageBuilderInline", () => ({
  PageBuilderInline: ({
    config,
    onChange,
  }: {
    config: { zones: { main: unknown[] } };
    onChange: (next: unknown) => void;
  }) => (
    <div data-testid="builder" data-zones={config.zones.main.length}>
      <button type="button" onClick={() => onChange({ version: 1, zones: { main: [] } })}>
        змінити
      </button>
    </div>
  ),
}));

vi.mock("@wwwuabot/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@wwwuabot/shared")>();
  return {
    ...actual,
    SaveActionButtons: (props: { onSave?: () => void; onSaveAndClose?: () => void }) => (
      <div>
        <button type="button" onClick={props.onSave}>
          save
        </button>
        <button type="button" onClick={props.onSaveAndClose}>
          save-close
        </button>
      </div>
    ),
  };
});

const CONFIG = {
  version: 1,
  zones: {
    sidebar: [],
    header: [],
    main: [{ id: "b1", type: "text", order: 0, props: {} }],
    footer: [],
  },
};

function builder(overrides: Partial<Parameters<typeof FullscreenBuilder>[0]> = {}) {
  const props = {
    slug: "viruvannia",
    allFields: { page_data: JSON.stringify(CONFIG), title: "Дослідження", photo_url: "" },
    updateField: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<FullscreenBuilder {...props} />);
  return props;
}

describe("FullscreenBuilder", () => {
  it("підписує вікно адресою сторінки", () => {
    builder();
    expect(screen.getByText(/Конструктор: viruvannia/)).toBeTruthy();
  });

  it("віддає конструктору збережену конфігурацію", () => {
    builder();
    expect(screen.getByTestId("builder").getAttribute("data-zones")).toBe("1");
  });

  it("зіпсований `page_data` не валить вікно — починає з порожньої сторінки", () => {
    builder({ allFields: { page_data: "{ не json" } });
    expect(screen.getByTestId("builder").getAttribute("data-zones")).toBe("0");
  });

  it("зміна в конструкторі лягає в `page_data` рядком", () => {
    const props = builder();
    fireEvent.click(screen.getByText("змінити"));

    expect(props.updateField).toHaveBeenCalledWith("page_data", expect.any(String));
    expect(JSON.parse(vi.mocked(props.updateField).mock.calls[0][1] as string)).toEqual({
      version: 1,
      zones: { main: [] },
    });
  });

  it("без збереження показує просту кнопку «Закрити»", () => {
    const props = builder();
    fireEvent.click(screen.getByRole("button", { name: /Закрити/ }));
    expect(props.onClose).toHaveBeenCalled();
  });

  it("зі збереженням віддає «зберегти» і «зберегти й закрити»", async () => {
    const props = builder({ onSave: vi.fn(async () => undefined) });

    fireEvent.click(screen.getByRole("button", { name: "save" }));
    expect(props.onSave).toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByRole("button", { name: "save-close" }));
    expect(props.onSave).toHaveBeenCalledWith(true);
    // Закриття стоїть **після** збереження: без `waitFor` перевірка побачила б
    // ще не виконаний проміс.
    await waitFor(() => expect(props.onClose).toHaveBeenCalled());
  });
});
