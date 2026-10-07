// @vitest-environment jsdom
/**
 * Введення дати — те, що ламається мовчки.
 *
 * `renderToStaticMarkup` не виконав би `onChange`, тож перевірити можна було б
 * тільки «поле намальоване», а не «кнопка веде на аналіз тієї самої дати».
 *
 * @module packages/ui/src/blocks/DateInputBlock.dom.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { DateInputBlock } from "./DateInputBlock";

function block(props: Record<string, unknown>): BlockComponentProps {
  return {
    block: { id: "b1", type: "date-input", order: 0, props },
    zone: "main",
    context: {} as BlockComponentProps["context"],
  };
}

/** Кнопка не має навігації доти, поки її не перевірити вручну. */
function captureNavigation(): { value: () => string } {
  let href = "";
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      get href() {
        return href;
      },
      set href(next: string) {
        href = next;
      },
    },
  });
  return { value: () => href };
}

const DATE = "1980-03-03";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DateInputBlock", () => {
  it("показує підпис і вимкнену кнопку, поки дати немає", () => {
    render(<DateInputBlock {...block({ label: "Дата народження" })} />);
    expect(screen.getByText("Дата народження")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Показати аналіз/ }).hasAttribute("disabled")).toBe(
      true,
    );
  });

  it("веде на рядок аналізу з тією самою датою", async () => {
    const nav = captureNavigation();
    const user = userEvent.setup();
    render(<DateInputBlock {...block({})} />);

    await user.type(screen.getByLabelText("Дата народження"), DATE);
    await user.click(screen.getByRole("button", { name: /Показати аналіз/ }));

    expect(nav.value()).toBe(`/mydate/analysis?dates=${DATE}`);
  });

  it("шлях і підписи сторінки перекривають типові", async () => {
    const nav = captureNavigation();
    const user = userEvent.setup();
    render(
      <DateInputBlock
        {...block({ label: "Народження", buttonLabel: "Далі", targetPath: "analyze" })}
      />,
    );

    await user.type(screen.getByLabelText("Народження"), DATE);
    await user.click(screen.getByRole("button", { name: "Далі" }));

    expect(nav.value()).toBe(`/mydate/analyze?dates=${DATE}`);
  });
});
