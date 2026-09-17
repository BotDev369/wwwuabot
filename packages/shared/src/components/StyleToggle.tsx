/**
 * `ThemeButton` — кнопка «Тема» в бічному меню (адмінка) і в блоках сторінки.
 *
 * Поверхня — та сама, що в меню профілю платформи: спільна `ThemeColorPanel`
 * («три кольори»), лише відкрита з іншого місця. Світлої / темної більше немає:
 * світлоту виводить сам продукт із **фону**, який задала людина.
 *
 * Розмітка — кирпичики `.wb-modal--full` / `.wb-sheet` / `.wb-menu-body`, тож
 * ця поверхня виглядає однаково з меню профілю, а не «схоже». Інлайн-стилів
 * тут більше немає — саме вони раніше робили адмінку схожою на себе, а не на
 * платформу (правило «однакова деталь — це кирпичик»).
 *
 * `useStyleTheme` лишається публічним із цього файлу: ним користуються блоки
 * сторінки (`ThemeBlock`, `ThemeToggleBlock`) та обидві оболонки.
 *
 * @module packages/shared/src/components/StyleToggle
 */

import { useCallback, useEffect, useState, type ReactElement } from "react";
import { Icon } from "./Icon";
import { ThemeColorPanel } from "./theme";

export { useStyleTheme } from "./theme";

/** Закриває поверхню на Escape і тримає сторінку від прокрутки під нею. */
function useModalSurface(open: boolean, close: () => void): void {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, close]);
}

export function ThemeButton({ compact = false }: { compact?: boolean }): ReactElement {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useModalSurface(open, close);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Тема"
        aria-label="Налаштування теми"
        className="wb-nav-item"
      >
        <span className="wb-nav-icon">
          <Icon name="sliders" size={18} />
        </span>
        {!compact && <span className="wb-nav-label">Тема</span>}
      </button>

      {open && (
        <div
          className="wb-modal-overlay wb-modal-overlay--tight"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            className="wb-modal wb-modal--full wb-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Тема"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="wb-modal-header wb-sheet-head">
              <h2 className="wb-modal-title">Тема</h2>
              <button
                type="button"
                className="wb-close-btn"
                onClick={() => setOpen(false)}
                aria-label="Закрити"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="wb-modal-body wb-menu-body">
              <ThemeColorPanel onClose={close} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Legacy exports (deprecated) ──────────────────────────────────────── */

/** @deprecated Use ThemeButton instead */
export function StylePicker(_props?: { compact?: boolean }) {
  return null;
}

/** @deprecated Use ThemeButton instead */
export function ThemeToggle(_props?: { compact?: boolean }) {
  return null;
}
