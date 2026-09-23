/**
 * `MenuList` — пункти меню як список: рядки або плитки.
 *
 * Виділено з `MenuModal` навмисно: розмітка пункту — це **деталь**, а не
 * поверхня. Ті самі пункти платформа показує і в аркуші (вибір вигляду,
 * теги), і **в потоці сторінки** (розділи хабу профілю) — і розійтися цим
 * двом не можна: пункт у потоці мусить мати ті самі мірки, той самий стан
 * заглушки й той самий підпис для скрінрідера, що й у модалці.
 *
 * @module @wwwuabot/ui/menu
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { MenuItem, MenuLayout } from "./types";

/** Підпис кнопки: у заглушки до назви додається пояснення, що там буде. */
function itemLabel(item: MenuItem): string {
  const soon = item.status === "soon";
  return soon && item.hint ? `${item.label}. ${item.hint}` : item.label;
}

function MenuRow({ item }: { item: MenuItem }): ReactElement {
  const soon = item.status === "soon";
  return (
    <button
      type="button"
      className={`wb-menu-item${soon ? " wb-menu-item--soon" : ""}`}
      onClick={item.onSelect}
      // Заглушка не мовчить: `aria-disabled` тут не потрібен — дотик навмисно
      // щось робить (каже, що розділ у роботі), тож кнопка справді активна.
      aria-label={itemLabel(item)}
      aria-pressed={item.selected}
    >
      <span className="wb-menu-item-icon">
        <Icon name={item.icon} size={20} />
      </span>
      <span className="wb-menu-item-text">
        <span className="wb-menu-item-label">{item.label}</span>
        {/* Пояснення є лише в тому, чого ще немає: у готового пункту його
            роботу видно за назвою, а зайвий рядок лише з'їдає висоту. */}
        {soon && item.hint && <span className="wb-menu-item-hint">{item.hint}</span>}
      </span>
      {item.selected && (
        <span className="wb-menu-item-check">
          <Icon name="check" size={18} />
        </span>
      )}
      {/* Шеврон — ознака переходу (`trailing`): так рядок каже, що за ним є
          екран, а не дія. Галочка і шеврон разом не трапляються: вибір — це
          стан, а не місце, куди ведуть. */}
      {item.trailing && (
        <span className="wb-menu-item-more">
          <Icon name="chevron-right" size={18} />
        </span>
      )}
    </button>
  );
}

/** Плитка: та сама кнопка, лише знак над підписом, а не збоку від нього. */
function MenuBlock({ item }: { item: MenuItem }): ReactElement {
  const soon = item.status === "soon";
  return (
    <button
      type="button"
      className={`wb-menu-block${soon ? " wb-menu-block--soon" : ""}`}
      onClick={item.onSelect}
      aria-label={itemLabel(item)}
      aria-pressed={item.selected}
    >
      <span className="wb-menu-block-icon">
        <Icon name={item.icon} size={22} />
      </span>
      <span className="wb-menu-block-label">{item.label}</span>
      {/* Заглушка лишається чесною (§7), але **одним словом**: абзац під
          назвою робив плитки різної висоти й читався як текст, а не як стан.
          Плитка бере готовий кирпичик стану (`.wb-badge`), а повне пояснення
          нікуди не зникло — воно в підписі кнопки й у діалозі після дотику. */}
      {soon && <span className="wb-badge wb-badge-neutral">Скоро</span>}
      {item.selected && (
        <span className="wb-menu-item-check">
          <Icon name="check" size={16} />
        </span>
      )}
    </button>
  );
}

export interface MenuListProps {
  items: readonly MenuItem[];
  /** Розкладка пунктів — рядки (типове) чи плитки. */
  layout?: MenuLayout;
}

export function MenuList({ items, layout = "rows" }: MenuListProps): ReactElement {
  const Item = layout === "blocks" ? MenuBlock : MenuRow;
  return (
    <div className={layout === "blocks" ? "wb-menu-blocks" : "wb-menu-list"}>
      {items.map((item) => (
        <Item key={item.key} item={item} />
      ))}
    </div>
  );
}
