/**
 * Тести хабу: **у кожного пункту дві дії, і кожна з них має ім'я**.
 *
 * Перевіряємо те, що ламається мовчки: кнопку без підпису (знак без
 * `aria-label` для скрінрідера не має назви), дію, яка вдає робочу, і розкладку,
 * що перестала бути іншою. Підпис пункту тут навмисно **не** кнопка — і це теж
 * перевіряється: у меню він нею є, і скопійована розмітка зробила б рядок із
 * трьома різними діями замість двох.
 *
 * Середовище тестів — `node` (без DOM), тож перевіряємо розмітку, яку рендерить
 * React, а не дотики: так само зроблено в `menu/MenuModal.test.tsx`.
 *
 * @module packages/ui/src/hub/HubList.test
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HubList } from "./HubList";
import type { HubItem } from "./types";

const noop = () => {};

function item(overrides: Partial<HubItem> & { key: string }): HubItem {
  return {
    label: overrides.key,
    icon: "text",
    actions: [
      { key: "view", label: "Переглянути", icon: "eye", onSelect: noop },
      { key: "create", label: "Створити", icon: "plus", onSelect: noop },
    ],
    ...overrides,
  };
}

const ITEMS: readonly HubItem[] = [
  item({ key: "Нотатки", status: "soon", hint: "буде" }),
  item({ key: "Контакти" }),
];

function html(layout?: "rows" | "blocks"): string {
  return renderToStaticMarkup(<HubList items={ITEMS} layout={layout} />);
}

describe("HubList", () => {
  it("у кожного пункту рівно дві дії — і обидві з іменем", () => {
    const markup = html();
    // Два пункти на дві дії — рівно чотири кнопки. Підписів у кнопок немає,
    // тож без `aria-label` вони були б безіменними.
    expect(markup.match(/wb-hub-btn/g)).toHaveLength(4);
    expect(markup.match(/aria-label="/g)?.length).toBe(4);
    expect(markup).toContain('aria-label="Переглянути"');
    expect(markup).toContain('aria-label="Створити"');
  });

  it("підпис пункту — не кнопка", () => {
    // Інакше в ряду було б три дії: назва теж щось робила б, і котра саме —
    // довелося б угадувати.
    const markup = html();
    // Назва живе в `span`, а кнопки — лише дії: по одній на кожну дію.
    expect(markup).toContain('<span class="wb-hub-label">Нотатки</span>');
    expect(markup.match(/<button/g)).toHaveLength(4);
  });

  it("дія, за якою ще нічого немає, позначена до дотику", () => {
    const markup = renderToStaticMarkup(
      <HubList
        items={[
          item({
            key: "Дати",
            actions: [
              { key: "view", label: "Переглянути", icon: "eye", onSelect: noop },
              { key: "create", label: "Створити", icon: "plus", soon: true, onSelect: noop },
            ],
          }),
        ]}
      />,
    );
    // Одна робоча, одна ні — і приглушена саме «створити».
    expect(markup.match(/wb-hub-btn--soon/g)).toHaveLength(1);
    expect(markup).toMatch(/wb-hub-btn--soon"[^>]*aria-label="Створити"/);
  });

  it("заглушка пункту каже про себе ще до дотику", () => {
    const markup = html();
    expect(markup).toContain("wb-hub-row--soon");
    expect(markup).toContain("wb-hub-hint");
    // У готового пункту пояснення немає: його роботу видно за назвою.
    expect(markup.match(/wb-hub-hint/g)).toHaveLength(1);
  });

  it("плитки — той самий пункт, лише інша розкладка", () => {
    const rows = html();
    const blocks = html("blocks");

    expect(rows).toContain("wb-hub-list");
    expect(rows).not.toContain("wb-hub-blocks");
    expect(blocks).toContain("wb-hub-blocks");
    expect(blocks).not.toContain("wb-hub-list");

    // Пункти ті самі: інакше це були б два різні списки.
    for (const label of ["Нотатки", "Контакти"]) expect(blocks).toContain(label);
    // У плитці замість абзаца — кирпичик стану, а імена дій лишаються.
    expect(blocks).toContain("wb-badge");
    expect(blocks).not.toContain("wb-hub-hint");
    expect(blocks.match(/aria-label="Створити"/g)).toHaveLength(2);
  });

  it("типова розкладка — рядки", () => {
    expect(html()).toContain("wb-hub-list");
  });
});
