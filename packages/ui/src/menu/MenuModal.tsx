/**
 * MenuModal — повноекранна модалка зі списком пунктів.
 *
 * Це та сама поверхня, що й композер (`.wb-modal--full .wb-sheet`), лише
 * замість вкладок — вертикальний список (або свій вміст: панель теми приходить
 * сюди слотом `content`): пункт на всю ширину, іконка, підпис, а для пункту,
 * якого ще немає, — рядок-пояснення, що там буде.
 *
 * Ліній тут немає жодної: пункт видно тлом (`--field-bg`, той самий кирпичик,
 * що у видимого поля) і підсвіченням на дотик, а не рамкою (`DESIGN_SYSTEM.md`,
 * правило 15). Вибраний пункт позначається галочкою (`selected`), бо вибір — це
 * стан, а не перехід.
 *
 * @module @wwwuabot/ui/menu
 */

import type { KeyboardEvent, ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { MenuItem, MenuModalProps } from "./types";

function MenuRow({ item }: { item: MenuItem }): ReactElement {
  const soon = item.status === "soon";
  return (
    <button
      type="button"
      className={`wb-menu-item${soon ? " wb-menu-item--soon" : ""}`}
      onClick={item.onSelect}
      // Заглушка не мовчить: `aria-disabled` тут не потрібен — дотик навмисно
      // щось робить (каже, що розділ у роботі), тож кнопка справді активна.
      aria-label={soon && item.hint ? `${item.label}. ${item.hint}` : item.label}
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
    </button>
  );
}

export function MenuModal({
  title,
  items,
  content,
  header,
  onClose,
  onBack,
}: MenuModalProps): ReactElement {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
  }

  return (
    <div className="wb-modal-overlay wb-modal-overlay--tight" onClick={onClose}>
      <div
        className="wb-modal wb-modal--full wb-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="wb-modal-header wb-sheet-head">
          {onBack && (
            <button type="button" className="wb-close-btn" onClick={onBack} aria-label="Назад">
              <Icon name="arrow-left" size={18} />
            </button>
          )}
          <h2 className="wb-modal-title">{title}</h2>
          <button type="button" className="wb-close-btn" onClick={onClose} aria-label="Закрити">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="wb-modal-body wb-menu-body">
          {/* Блок над списком — не пункт, тож і не всередині `role="menu"`:
              він описує меню, а не діє замість нього. */}
          {header}
          {/* Панель і список — один слот: панель теми замінює список, а не
              стає ще одним над ним. */}
          {content ?? (
            <div className="wb-menu-list">
              {(items ?? []).map((item) => (
                <MenuRow key={item.key} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
