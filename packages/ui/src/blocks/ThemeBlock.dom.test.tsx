// @vitest-environment jsdom
/**
 * Блок теми — те, що ламається мовчки.
 *
 * Три варіанти блока малюють три різні контроли, і кожен зводиться до однієї
 * дії: «перемкнути схему». Тому перевіряємо не розмітку заради розмітки, а те,
 * що дотик справді змінює `data-theme` на `<html>` — саме з нього читають
 * кольори всі стилі.
 *
 * @module packages/ui/src/blocks/ThemeBlock.dom.test
 */

import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { ThemeBlock } from "./ThemeBlock";

function block(props: Record<string, unknown> = {}): BlockComponentProps {
  return {
    block: { id: "b1", type: "theme", order: 0, props },
    zone: "header",
    context: {} as BlockComponentProps["context"],
  };
}

/** Схема, яку бачать стилі: атрибут на корені документа. */
function scheme(): string | null {
  return document.documentElement.getAttribute("data-theme");
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

describe("блок теми", () => {
  it("варіант «toggle» перемикає схему й показує свій підпис", async () => {
    const user = userEvent.setup();
    render(<ThemeBlock {...block({ variant: "toggle", label: "Вигляд" })} />);

    const toggle = screen.getByRole("button", { name: "Перемикач теми" });
    expect(toggle.textContent).toContain("Вигляд");

    const before = scheme();
    await user.click(toggle);

    expect(scheme()).not.toBe(before);
    expect(["light", "dark"]).toContain(scheme());
  });

  it("варіант «toggle» без свого підпису називає поточну схему", () => {
    render(<ThemeBlock {...block({ variant: "toggle", showLabel: false })} />);

    const toggle = screen.getByRole("button", { name: "Перемикач теми" });
    // Підпису немає — але заголовок каже, що станеться після дотику.
    expect(toggle.getAttribute("title")).toMatch(/Перемкнути на/);
  });

  it("компактний варіант — кругла кнопка з тим самим підписом для скрінрідера", () => {
    render(<ThemeBlock {...block({ variant: "compact" })} />);

    const compact = screen.getByRole("button", { name: "Перемикач теми" });
    expect(compact.getAttribute("title")).toMatch(/Зараз:/);
  });

  it("варіант «modal» — спільна кнопка теми, а не власна розмітка", () => {
    render(<ThemeBlock {...block()} />);

    expect(document.querySelector(".wb-block-theme")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Перемикач теми" })).toBeNull();
  });
});
