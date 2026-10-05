// @vitest-environment jsdom
/**
 * Ввід дат для порівняння й вибір систем: що станеться, коли людина до них доторкнеться.
 *
 * Тут єдина спільна відповідь на питання «коли людина щось додала»: вона мусить
 * потрапити в наступний екран у тому самому порядку, у якому її ставили. Тому
 * перевіряються не тільки кнопки, а й те, що саме піде в адресу.
 *
 * @module packages/ui/src/blocks/mydate-setup.dom.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { CompareSetupBlock } from "./CompareSetupBlock";
import { CompareSystemsBlock } from "./CompareSystemsBlock";

function props(over: Record<string, unknown> = {}): BlockComponentProps {
  return {
    block: { id: "b1", type: "x", order: 0, props: over },
    zone: "main",
    context: {} as BlockComponentProps["context"],
  };
}

/**
 * Адреса, на яку пішов би блок: повна замість `pushState`, бо це інша сторінка.
 * `location` тут підмінюється, тож оригінал обовʼязково повертається — інакше
 * наступний тест не зможе прочитати `search` і вважатиме, що дат немає.
 */
let savedLocation: PropertyDescriptor | undefined;

function captureNavigation(): { value: () => string } {
  savedLocation ??= Object.getOwnPropertyDescriptor(window, "location");
  let href = "";
  const real = window.location;
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      // Читання лишається справжнім: блоки читають `location.search`, тож
      // глуха заглушка вдарила б по them самим тестам.
      get search() {
        return real.search;
      },
      get pathname() {
        return real.pathname;
      },
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

function restoreLocation(): void {
  if (!savedLocation) return;
  Object.defineProperty(window, "location", savedLocation);
  savedLocation = undefined;
}

/** Поле дати не має підпису, тож шукаємо його за типом, а не за роллю. */
function dateField(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[type="date"]');
  if (!input) throw new Error("поля дати немає на екрані");
  return input;
}

beforeEach(() => {
  restoreLocation();
  window.history.replaceState({}, "", "/mydate/compare/setup");
});

afterEach(() => {
  restoreLocation();
});

describe("CompareSetupBlock", () => {
  it("порожній список не пропонує перейти далі", () => {
    const { container } = render(<CompareSetupBlock {...props()} />);
    expect(screen.getByRole("button", { name: /Додайте хоча б одну дату/ })).toBeTruthy();
  });

  it("додає дату й показує її в табличному вигляді", async () => {
    const user = userEvent.setup();
    const { container } = render(<CompareSetupBlock {...props()} />);
    await user.type(dateField(container), "1980-03-03");
    await user.click(screen.getByRole("button", { name: "Додати дату" }));
    expect(screen.getByText("03.03.1980")).toBeTruthy();
  });

  it("не додає ту саму дату двічі", async () => {
    const user = userEvent.setup();
    const { container } = render(<CompareSetupBlock {...props()} />);
    const field = dateField(container);
    await user.type(field, "1980-03-03");
    await user.click(screen.getByRole("button", { name: "Додати дату" }));
    await user.type(field, "1980-03-03");
    await user.click(screen.getByRole("button", { name: "Додати дату" }));
    expect(screen.getAllByText("03.03.1980")).toHaveLength(1);
  });

  it("порядок дат з адреси відповідає порядку на екрані", async () => {
    const nav = captureNavigation();
    const user = userEvent.setup();
    const { container } = render(<CompareSetupBlock {...props()} />);
    const field = dateField(container);
    await user.type(field, "1980-03-03");
    await user.click(screen.getByRole("button", { name: "Додати дату" }));
    await user.type(field, "2003-02-15");
    await user.click(screen.getByRole("button", { name: "Додати дату" }));

    // Друга дата вгору — тоді порядок у адресі має змінитися разом із екраном.
    await user.click(screen.getAllByTitle("Вгору")[1]);
    await user.click(screen.getByRole("button", { name: /Обрати системи/ }));

    expect(nav.value()).toBe("/mydate/compare/systems?dates=2003-02-15%2C1980-03-03");
  });

  it("видаляє дату зі списку", async () => {
    const user = userEvent.setup();
    const { container } = render(<CompareSetupBlock {...props()} />);
    const field = dateField(container);
    await user.type(field, "1980-03-03");
    await user.click(screen.getByRole("button", { name: "Додати дату" }));
    await user.click(screen.getByTitle("Видалити"));
    expect(screen.queryByText("03.03.1980")).toBeNull();
    expect(screen.getByRole("button", { name: /Додайте хоча б одну дату/ })).toBeTruthy();
  });

  it("не переростає ліміт дат", async () => {
    const user = userEvent.setup();
    const { container } = render(<CompareSetupBlock {...props({ maxDates: 1 })} />);
    const field = dateField(container);
    await user.type(field, "1980-03-03");
    await user.click(screen.getByRole("button", { name: "Додати дату" }));
    expect(screen.getByRole("button", { name: "Додати дату" }).hasAttribute("disabled")).toBe(true);
  });
});

describe("CompareSystemsBlock", () => {
  it("вибір систем знімається й повертається — лічильник іде за вибором", async () => {
    window.history.replaceState({}, "", "/mydate/compare/systems?dates=1980-03-03");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              ok: true,
              systems: [
                {
                  id: "western",
                  name: "Західна астрологія",
                  description: "d",
                  implemented: true,
                  parameters: [{ key: "sign", label: "Знак" }],
                },
              ],
            }),
            { status: 200 },
          ),
      ),
    );
    const user = userEvent.setup();
    const { container } = render(
      <CompareSystemsBlock {...props({ resultUrl: "/mydate/compare/table" })} />,
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (!checkbox) throw new Error("чекбокса системи немає");
    expect(checkbox.checked).toBe(true);
    await user.click(checkbox);
    expect(checkbox.checked).toBe(false);
    vi.unstubAllGlobals();
  });

  it("передає дати параметрами, а не сегментом адреси", async () => {
    window.history.replaceState({}, "", "/mydate/compare/systems?dates=1980-03-03");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              ok: true,
              systems: [
                {
                  id: "western",
                  name: "Західна астрологія",
                  description: "d",
                  implemented: true,
                  parameters: [{ key: "sign", label: "Знак" }],
                },
              ],
            }),
            { status: 200 },
          ),
      ),
    );
    const user = userEvent.setup();
    render(<CompareSystemsBlock {...props()} />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const nav = captureNavigation();
    await user.click(screen.getByRole("button", { name: "Співставити" }));

    // Сегмент `/mydate/1980-03-03` не знайшов би рядок: `ScenarioPage` бере
    // весь splat як slug, тож стан їде параметром, як у `compare-setup`.
    expect(nav.value()).toBe("/mydate/compare/table?dates=1980-03-03&sys=western&p=sign");
    vi.unstubAllGlobals();
  });
});
