// @vitest-environment jsdom
/**
 * Крок «кого або що аналізуємо»: коли людина щось додала, суб'єкт мусить
 * потрапити в наступний екран у тому самому порядку, зі своїм іменем і своїм
 * видом — вид їде адресою, бо результат відкривається посиланням.
 *
 * @module packages/ui/src/blocks/date-analysis-setup.dom.test
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { CompareSetupBlock } from "./CompareSetupBlock";

function props(over: Record<string, unknown> = {}): BlockComponentProps {
  return {
    block: { id: "b1", type: "compare-setup", order: 0, props: over },
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
      // глуха заглушка вдарила б по ним самим тестам.
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

/** Поле дати не має ролі (це не кнопка), тож шукаємо його за типом. */
function dateField(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[type="date"]');
  if (!input) throw new Error("поля дати немає на екрані");
  return input;
}

/** Поле імені — текстове; його теж шукаємо за типом. */
function nameField(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[type="text"]');
  if (!input) throw new Error("поля імені немає на екрані");
  return input;
}

beforeEach(() => {
  restoreLocation();
  window.history.replaceState({}, "", "/dateanalysis/person");
});

afterEach(() => {
  restoreLocation();
});

describe("CompareSetupBlock", () => {
  it("порожній список не веде далі", () => {
    render(<CompareSetupBlock {...props({ maxDates: 3 })} />);
    expect(screen.getByRole("button", { name: "Вкажіть дату" }).hasAttribute("disabled")).toBe(
      true,
    );
  });

  it("додає суб'єкта з іменем і показує його в списку", async () => {
    const user = userEvent.setup();
    const { container } = render(<CompareSetupBlock {...props({ maxDates: 3 })} />);
    await user.type(nameField(container), "Олена");
    await user.type(dateField(container), "1980-03-03");
    await user.click(screen.getByRole("button", { name: "Додати" }));
    expect(screen.getByText("Олена")).toBeTruthy();
    expect(screen.getByText("03.03.1980")).toBeTruthy();
  });

  it("не додає ту саму дату двічі", async () => {
    const user = userEvent.setup();
    const { container } = render(<CompareSetupBlock {...props({ maxDates: 3 })} />);
    const field = dateField(container);
    await user.type(field, "1980-03-03");
    await user.click(screen.getByRole("button", { name: "Додати" }));
    await user.type(field, "1980-03-03");
    await user.click(screen.getByRole("button", { name: "Додати" }));
    expect(screen.getAllByText("03.03.1980")).toHaveLength(1);
  });

  it("порядок суб'єктів з адреси відповідає порядку на екрані", async () => {
    const nav = captureNavigation();
    const user = userEvent.setup();
    const { container } = render(<CompareSetupBlock {...props({ maxDates: 3 })} />);
    const field = dateField(container);
    await user.type(nameField(container), "Олена");
    await user.type(field, "1980-03-03");
    await user.click(screen.getByRole("button", { name: "Додати" }));

    await user.type(nameField(container), "Ігор");
    await user.type(field, "2003-02-15");
    await user.click(screen.getByRole("button", { name: "Додати" }));

    // Другий суб'єкт угору — тоді порядок у адресі має змінитися разом з екраном.
    await user.click(screen.getAllByTitle("Вгору")[1]);
    await user.click(screen.getByRole("button", { name: /Обрати системи/ }));

    const url = new URL(nav.value(), "https://example.test");
    expect(url.pathname).toBe("/dateanalysis/analysis");
    expect(url.searchParams.get("dates")).toBe("2003-02-15,1980-03-03");
    expect(url.searchParams.get("labels")).toBe("Ігор|Олена");
    expect(url.searchParams.get("kind")).toBe("person");
  });

  it("подія їде власним видом", async () => {
    const nav = captureNavigation();
    const user = userEvent.setup();
    const { container } = render(<CompareSetupBlock {...props({ maxDates: 1, kind: "event" })} />);
    await user.type(nameField(container), "Весілля");
    await user.type(dateField(container), "2021-05-12");
    await user.click(screen.getByRole("button", { name: "Додати" }));
    await user.click(screen.getByRole("button", { name: /Обрати системи/ }));

    const url = new URL(nav.value(), "https://example.test");
    expect(url.searchParams.get("kind")).toBe("event");
    expect(url.searchParams.get("labels")).toBe("Весілля");
  });

  it("у змішаному режимі вид задає кожен рядок", async () => {
    const nav = captureNavigation();
    const user = userEvent.setup();
    const { container } = render(<CompareSetupBlock {...props({ maxDates: 3, kind: "mixed" })} />);

    // Перший — людина (типовий вид), другий — подія.
    await user.type(nameField(container), "Олена");
    await user.type(dateField(container), "1980-03-03");
    await user.click(screen.getByRole("button", { name: "Додати" }));

    const kindSelects = container.querySelectorAll("select");
    const draft = kindSelects[0] as HTMLSelectElement;
    await user.selectOptions(draft, "event");
    await user.type(nameField(container), "Весілля");
    await user.type(dateField(container), "2021-05-12");
    await user.click(screen.getByRole("button", { name: "Додати" }));
    await user.click(screen.getByRole("button", { name: /Обрати системи/ }));

    const url = new URL(nav.value(), "https://example.test");
    expect(url.searchParams.get("kind")).toBe("person,event");
    expect(url.searchParams.get("labels")).toBe("Олена|Весілля");
  });

  it("режим «себе» бере ім'я з профілю й одну дату", async () => {
    const nav = captureNavigation();
    const user = userEvent.setup();
    const { container } = render(
      <CompareSetupBlock
        {...props({ kind: "person", selfMode: true, maxDates: 1 })}
        context={{ user: { id: 1, firstName: "Олена" } } as BlockComponentProps["context"]}
      />,
    );

    expect(nameField(container).value).toBe("Олена");
    expect(screen.queryByRole("button", { name: "Додати" })).toBeNull();

    await user.type(dateField(container), "1980-03-03");
    await user.click(screen.getByRole("button", { name: /Обрати системи/ }));

    const url = new URL(nav.value(), "https://example.test");
    expect(url.searchParams.get("self")).toBe("1");
    expect(url.searchParams.get("dates")).toBe("1980-03-03");
  });

  it("видаляє суб'єкта зі списку", async () => {
    const user = userEvent.setup();
    const { container } = render(<CompareSetupBlock {...props({ maxDates: 3 })} />);
    await user.type(dateField(container), "1980-03-03");
    await user.click(screen.getByRole("button", { name: "Додати" }));
    await user.click(screen.getByTitle("Видалити"));
    expect(screen.queryByText("03.03.1980")).toBeNull();
    expect(screen.getByRole("button", { name: "Вкажіть дату" })).toBeTruthy();
  });

  it("не переростає ліміт суб'єктів", async () => {
    const user = userEvent.setup();
    const { container } = render(<CompareSetupBlock {...props({ maxDates: 1 })} />);
    await user.type(dateField(container), "1980-03-03");
    await user.click(screen.getByRole("button", { name: "Додати" }));
    expect(screen.getByRole("button", { name: "Додати" }).hasAttribute("disabled")).toBe(true);
  });
});
