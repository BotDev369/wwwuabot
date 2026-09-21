/**
 * `HubList` — список пунктів, у кожного з яких дві дії праворуч.
 *
 * Розмітка пункту одна на дві розкладки: «рядок» (`layout="rows"`, типове) —
 * назва ліворуч, знаки праворуч; «плитка» (`layout="blocks"`) — те саме
 * стовпчиком, по дві в ряду. Так само влаштований `MenuList`, і це навмисно:
 * мірки, стан заглушки й підпис для скрінрідера мусять збігатися з меню, бо
 * людина бачить їх на сусідніх екранах.
 *
 * **Підпис пункту — не кнопка.** У меню дотик до рядка робить одну річ, тож
 * усю площу віддають їй; тут дій дві, і рядок, який робить щось третє, змушував
 * би вгадувати, котра з трьох. Тому дію називає знак, а назва пункту лишається
 * назвою.
 *
 * @module @wwwuabot/ui/hub
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { HubAction, HubItem, HubListProps } from "./types";

/** Пункт, за яким немає жодної робочої дії — він і каже про себе «скоро». */
function isSoon(item: HubItem): boolean {
  return item.status === "soon";
}

/**
 * Дії пункту — той самий набір в обох розкладках.
 *
 * Знак без підпису мусить мати ім'я: `aria-label` — єдине, чим кнопка
 * називається для того, хто її не бачить, і він же йде в `title` для миші.
 */
function HubActions({ actions }: { actions: readonly HubAction[] }): ReactElement {
  return (
    <span className="wb-hub-actions">
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          className={`wb-hub-btn${action.soon ? " wb-hub-btn--soon" : ""}`}
          aria-label={action.label}
          title={action.label}
          onClick={action.onSelect}
        >
          <Icon name={action.icon} size={18} />
        </button>
      ))}
    </span>
  );
}

/** Рядок: назва на всю ширину, знаки — у кінці. Пункт читають згори вниз. */
function HubRow({ item }: { item: HubItem }): ReactElement {
  const soon = isSoon(item);
  return (
    <div className={`wb-hub-row${soon ? " wb-hub-row--soon" : ""}`}>
      <span className="wb-hub-icon">
        <Icon name={item.icon} size={20} />
      </span>
      <span className="wb-hub-text">
        <span className="wb-hub-label">{item.label}</span>
        {/* Пояснення є лише в того, чого ще немає: у готового пункту його
            роботу видно за назвою, а зайвий рядок з'їдає висоту списку. */}
        {soon && item.hint && <span className="wb-hub-hint">{item.hint}</span>}
      </span>
      <HubActions actions={item.actions} />
    </div>
  );
}

/**
 * Плитка: назва над знаками, а замість абзаца — кирпичик стану (`.wb-badge`).
 * Абзац робив плитки різної висоти, а повне пояснення нікуди не зникає — воно
 * в підписі дії й у діалозі після дотику.
 */
function HubBlock({ item }: { item: HubItem }): ReactElement {
  const soon = isSoon(item);
  return (
    <div className={`wb-hub-block${soon ? " wb-hub-block--soon" : ""}`}>
      <span className="wb-hub-icon">
        <Icon name={item.icon} size={22} />
      </span>
      <span className="wb-hub-label">{item.label}</span>
      {soon && <span className="wb-badge wb-badge-neutral">Скоро</span>}
      <HubActions actions={item.actions} />
    </div>
  );
}

export function HubList({ items, layout = "rows" }: HubListProps): ReactElement {
  const Item = layout === "blocks" ? HubBlock : HubRow;
  return (
    <div className={layout === "blocks" ? "wb-hub-blocks" : "wb-hub-list"}>
      {items.map((item) => (
        <Item key={item.key} item={item} />
      ))}
    </div>
  );
}
