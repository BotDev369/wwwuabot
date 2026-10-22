/**
 * Тести контекстного футера.
 *
 * Перевіряємо те, що ламається мовчки: порожній набір дій малював би порожню
 * смугу над футером, головна дія без `aria-label` лишилась би без назви, а
 * вибір без `aria-pressed` не сказав би скрінрідеру, що він увімкнений.
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ContextBar, type ContextAction } from "./ContextBar";

const groups: ContextAction = {
  key: "groups",
  label: "Групи",
  icon: "folder",
  onSelect: () => undefined,
};

const order: ContextAction = {
  key: "order",
  label: "Порядок",
  icon: "sort",
  active: true,
  onSelect: () => undefined,
};

const add: ContextAction = {
  key: "add",
  label: "Додати трекер",
  icon: "plus",
  primary: true,
  onSelect: () => undefined,
};

function render(actions: ContextAction[]): string {
  return renderToStaticMarkup(<ContextBar actions={actions} label="Дії трекерів" />);
}

describe("контекстний футер", () => {
  it("⛔ без дій смуги немає — порожній ряд над футером не малюється", () => {
    expect(render([])).toBe("");
  });

  it("другорядна дія несе підпис, а вибір — свій стан", () => {
    expect(render([order])).toContain('aria-pressed="true"');
    // Вибір вимкнений — це теж стан, а не відсутність ознаки.
    expect(render([{ ...order, active: false }])).toContain('aria-pressed="false"');
    // Звичайна дія — не перемикач, і вигадувати їй стан не можна.
    const plain = render([groups]);
    expect(plain).toContain("Групи");
    expect(plain).not.toContain("aria-pressed");
  });

  it("головна дія — куля без слова, але з назвою для скрінрідера", () => {
    const html = render([groups, add]);

    expect(html).toContain('aria-label="Додати трекер"');
    expect(html).toContain("wb-contextbar-btn--primary");
    // Підпису в кулі немає: знак каже все, а слово забирало б місце в смузі.
    expect(html).not.toContain(">Додати трекер<");
  });

  it("недоступна дія лишається на місці", () => {
    const html = render([{ ...groups, disabled: true }]);

    expect(html).toContain("disabled");
  });

  it("смуга — панель інструментів із назвою, а не друга навігація", () => {
    const html = render([groups]);

    expect(html).toContain('role="toolbar"');
    expect(html).toContain('aria-label="Дії трекерів"');
  });
});
