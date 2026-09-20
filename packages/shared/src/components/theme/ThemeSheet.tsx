/**
 * `ThemeSheet` — панель теми у спільній поверхні (`.wb-sheet`).
 *
 * Поверхня теми **одна на продукт**, і це головне в цьому файлі: платформа
 * відкриває її пунктом «Тема» на своєму хабі `/profile`, адмінка — кнопкою в
 * бічному меню. Два різні контейнери означали б, що той самий вибір трьох
 * кольорів живе у двох місцях і розійдеться на першій же правці; тому аркуш
 * тут, а не в кожній оболонці.
 *
 * Сама панель (`ThemeColorPanel`) при цьому лишається спільною — цей файл
 * відповідає тільки за рамку: шапку з виходом і блокування прокрутки під нею.
 *
 * @module packages/shared/src/components/theme/ThemeSheet
 */

import { useEffect, type ReactElement } from "react";
import { Icon } from "../Icon";
import { ThemeColorPanel } from "./ThemeColorPanel";

interface ThemeSheetProps {
  /** Закрити поверхню. Панель кличе це з «Зберегти і закрити». */
  onClose: () => void;
}

/** Закриває поверхню на Escape і тримає сторінку від прокрутки під нею. */
function useModalSurface(close: () => void): void {
  useEffect(() => {
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
  }, [close]);
}

export function ThemeSheet({ onClose }: ThemeSheetProps): ReactElement {
  useModalSurface(onClose);

  return (
    <div
      className="wb-modal-overlay wb-modal-overlay--tight"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
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
          <button type="button" className="wb-close-btn" onClick={onClose} aria-label="Закрити">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="wb-modal-body wb-menu-body">
          <ThemeColorPanel onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
