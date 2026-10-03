/**
 * `ThemeCardMenu` — меню дій однієї картки: «···» у її верхньому кутку.
 *
 * **Це єдиний виняток із заборони дропдаунів** (`AGENTS.md` §4): меню не
 * веде кудись, а щось робить із конкретною річчю — карткою, до якої воно
 * прив'язане. Модалка на все вікно тут була б розтятнутим способом натиснути
 * «змінити» на одній із дванадцяти карток.
 *
 * Закривається дотиком поза, клавішею Escape і вибором пункту. Пункт — це
 * кнопка на всю ширину, а не рядок списку: тап-таргет лишається цілком.
 *
 * @module packages/shared/src/components/theme/ThemeCardMenu
 */

import { useEffect, useRef, useState, type ReactElement } from "react";
import { Icon, type IconName } from "../Icon";

export interface ThemeCardAction {
  /** Короткий клюк: його повертає `onSelect`, а не індекс. */
  key: string;
  label: string;
  icon: IconName;
  /** Небезпечна дія (видалити) — червона підписом. */
  danger?: boolean;
}

export interface ThemeCardMenuProps {
  /** Підпис меню для читача екрана: що саме воно робить. */
  label: string;
  actions: readonly ThemeCardAction[];
  onSelect: (key: string) => void;
}

export function ThemeCardMenu({ label, actions, onSelect }: ThemeCardMenuProps): ReactElement {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Закриття поза та Escape — інакше меню лишилося б висити поверх карток.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent): void => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="wb-theme-card-menu" ref={root}>
      <button
        type="button"
        className="wb-theme-card-menu-btn"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Icon name="more" size={16} />
      </button>

      {open && (
        <div className="wb-theme-card-menu-list" role="menu">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              role="menuitem"
              className={`wb-theme-card-menu-item${action.danger ? " wb-theme-card-menu-item--danger" : ""}`}
              onClick={() => {
                setOpen(false);
                onSelect(action.key);
              }}
            >
              <Icon name={action.icon} size={16} />
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
