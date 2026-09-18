/**
 * Тести меню-модалки.
 *
 * Перевіряємо те, що легко зламати мовчки: що це ТА САМА поверхня, що й
 * композер, що пункт-заглушка каже про себе ще до дотику, що вибір видно
 * галочкою, що «назад» є лише там, де є куди вертатись, і що два варіанти
 * розкладки (рядки / плитки) та притискання вмісту до низу справді різні.
 *
 * Середовище тестів — `node` (без DOM), тож перевіряємо розмітку, яку рендерить
 * React, а не дотики: так само зроблено в `composer/ComposerModal.test.tsx`.
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MenuModal } from "./MenuModal";
import type { MenuItem } from "./types";

const noop = () => {};

function item(overrides: Partial<MenuItem> & { key: string }): MenuItem {
  return { label: overrides.key, icon: "text", onSelect: noop, ...overrides };
}

const ITEMS: readonly MenuItem[] = [
  item({ key: "contacts", label: "Контакти", icon: "mail", status: "soon", hint: "буде" }),
  item({ key: "notes", label: "Нотатки", icon: "text" }),
  item({ key: "theme", label: "Тема", icon: "sliders", selected: true }),
];

function html(props: Partial<Parameters<typeof MenuModal>[0]> = {}): string {
  return renderToStaticMarkup(
    <MenuModal title="Профіль" items={ITEMS} onClose={noop} {...props} />,
  );
}

describe("MenuModal", () => {
  it("це та сама поверхня, що й композер", () => {
    // Спільний кирпичик `.wb-sheet`: дві майже однакові поверхні розійшлися б
    // по відступах, тінях і безпечних зонах.
    expect(html()).toContain("wb-modal-overlay--tight");
    expect(html()).toContain("wb-modal--full");
    expect(html()).toContain("wb-sheet");
    expect(html()).toContain("wb-sheet-head");
    expect(html()).toContain("wb-modal-body");
  });

  it("показує пункти в тому порядку, який дала оболонка", () => {
    const markup = html();
    const order = ["Контакти", "Нотатки", "Тема"].map((label) => markup.indexOf(label));
    expect(order[0]).toBeGreaterThan(-1);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("заглушка каже про себе ще до дотику", () => {
    const markup = html();
    expect(markup).toContain("wb-menu-item--soon");
    expect(markup).toContain("wb-menu-item-hint");
    // Ім'я пункту при цьому лишається в підписі кнопки: пояснення — не заміна.
    expect(markup).toContain('aria-label="Контакти. буде"');
  });

  it("у готового пункту пояснення немає", () => {
    const markup = renderToStaticMarkup(
      <MenuModal
        title="Профіль"
        items={[item({ key: "notes", label: "Нотатки" })]}
        onClose={noop}
      />,
    );
    expect(markup).not.toContain("wb-menu-item-hint");
    expect(markup).not.toContain("wb-menu-item--soon");
  });

  it("вибір показує галочка — це стан, а не перехід", () => {
    expect(html()).toContain("wb-menu-item-check");
    expect(html()).toContain('aria-pressed="true"');
    expect(html().match(/wb-menu-item-check/g)).toHaveLength(1);
  });

  it("«назад» є лише там, де є куди вертатись", () => {
    expect(html()).not.toContain("Назад");
    expect(html({ onBack: noop })).toContain('aria-label="Назад"');
  });

  it("закриття є завжди — це корінь поверхні", () => {
    expect(html()).toContain('aria-label="Закрити"');
  });

  it("заголовок підписаний для скрінрідера", () => {
    expect(html()).toContain('aria-modal="true"');
    expect(html()).toContain('aria-label="Профіль"');
    expect(html()).toContain(">Профіль<");
  });

  it("блок над списком стоїть до пунктів, а не замість них", () => {
    const markup = html({ header: <span className="wb-menu-account">Хтось</span> });
    expect(markup.indexOf("wb-menu-account")).toBeGreaterThan(-1);
    expect(markup.indexOf("wb-menu-account")).toBeLessThan(markup.indexOf("wb-menu-list"));
  });

  it("плитки — той самий пункт, лише інша розкладка", () => {
    const rows = html();
    const blocks = html({ layout: "blocks" });

    // Розкладка міняється, пункти — ні: інакше це були б два різні меню.
    expect(rows).toContain("wb-menu-list");
    expect(rows).not.toContain("wb-menu-blocks");
    expect(blocks).toContain("wb-menu-blocks");
    expect(blocks).not.toContain("wb-menu-list");
    for (const label of ["Контакти", "Нотатки", "Тема"]) expect(blocks).toContain(label);
    // Заглушка лишається чесною і в плитці: пояснення нікуди не зникає.
    expect(blocks).toContain("wb-menu-block-hint");
    expect(blocks).toContain('aria-label="Контакти. буде"');
    // Вибір — стан в обох розкладках.
    expect(blocks.match(/wb-menu-item-check/g)).toHaveLength(1);
  });

  it("притискання до низу — стан поверхні, а не розкладки", () => {
    expect(html()).not.toContain("wb-menu-body--end");
    expect(html({ align: "end" })).toContain("wb-menu-body--end");
    // Притиснути можна й список, і плитки: це різні рішення.
    expect(html({ align: "end", layout: "blocks" })).toContain("wb-menu-blocks");
  });
});
