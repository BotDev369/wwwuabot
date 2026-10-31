// @vitest-environment jsdom
/**
 * Конструктор веб-сторінки: зміна їде у `page_data` рядком, повний екран —
 * окрема дія, а кривий JSON не валить вкладку.
 *
 * @module web-admin-dev/src/pages/scenarios/WebConstructor.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const builder = vi.hoisted(() => ({ change: null as null | ((config: unknown) => void) }));
vi.mock("../../features/page-builder/PageBuilderInline", () => ({
  PageBuilderInline: ({
    config,
    onChange,
    title,
  }: {
    config: { version?: number };
    onChange: (config: unknown) => void;
    title?: string | null;
  }) => {
    builder.change = onChange;
    return (
      <button type="button" data-testid="builder" onClick={() => onChange({ version: 9 })}>
        {String(config.version)}:{String(title)}
      </button>
    );
  },
}));

const { WebConstructor } = await import("./WebConstructor");

describe("WebConstructor", () => {
  it("бере сторінку з полів і віддає назву конструктору", () => {
    render(
      <WebConstructor
        fields={{ page_data: { version: 1 }, title: "Вірування" }}
        updateField={vi.fn()}
        slug="viruvannia"
      />,
    );

    expect(screen.getByTestId("builder").textContent).toBe("1:Вірування");
  });

  it("зміна в конструкторі стає рядком у `page_data`", () => {
    const updateField = vi.fn();
    render(<WebConstructor fields={{}} updateField={updateField} slug="viruvannia" />);

    fireEvent.click(screen.getByTestId("builder"));
    expect(updateField).toHaveBeenCalledWith("page_data", JSON.stringify({ version: 9 }));
  });

  it("кривий JSON не валить вкладку — починаємо з порожньої сторінки", () => {
    render(
      <WebConstructor fields={{ page_data: "{не json" }} updateField={vi.fn()} slug="viruvannia" />,
    );

    expect(screen.getByTestId("builder")).toBeTruthy();
  });

  it("повний екран є лише тоді, коли його дали", () => {
    const onFullscreen = vi.fn();
    const view = render(
      <WebConstructor
        fields={{}}
        updateField={vi.fn()}
        slug="viruvannia"
        onFullscreen={onFullscreen}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /На весь екран/ }));
    expect(onFullscreen).toHaveBeenCalled();
    view.unmount();

    render(<WebConstructor fields={{}} updateField={vi.fn()} slug="viruvannia" />);
    expect(screen.queryByRole("button", { name: /На весь екран/ })).toBeNull();
  });
});
