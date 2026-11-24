/**
 * `MenuButton` — вхід у навігацію: паляниця в закритому стані, смуги-хрестик у
 * відкритому. Хрестик закриття не може виглядати як хліб: його впізнають, а не
 * згадують. Фото передає місце — знак продукту живе не в спільному компоненті.
 *
 * @module packages/ui/src/nav/MenuButton
 */

import type { ReactElement } from "react";

/** Слово меню — одне на кнопку й на підпис поверхні, щоб не розходилось. */
export const MENU_LABEL = "Меню";

export interface MenuButtonProps {
  /** Меню відкрите: замість паляниці — смуги, складені в хрестик. */
  open?: boolean;
  onClick: () => void;
  /** Підпис для скрінрідера; за замовчуванням — `MENU_LABEL`. */
  label?: string;
  /**
   * Кадр паляниці для закритого стану. Без нього — три смуги, як в адмінці:
   * знак місця, а не знак продукту.
   */
  photo?: string;
}

export function MenuButton({
  open = false,
  onClick,
  label = MENU_LABEL,
  photo,
}: MenuButtonProps): ReactElement {
  const bread = photo != null && !open;
  return (
    <button
      type="button"
      className={`wb-menubtn${bread ? " wb-menubtn--bread" : ""}`}
      aria-label={label}
      aria-expanded={open}
      data-open={open ? "true" : undefined}
      onClick={onClick}
    >
      {bread ? (
        <span className="wb-menubtn__bread" aria-hidden="true">
          <img src={photo} alt="" draggable={false} />
        </span>
      ) : (
        <span className="wb-menubtn__bars" aria-hidden="true">
          <span className="wb-menubtn__bar" />
          <span className="wb-menubtn__bar" />
          <span className="wb-menubtn__bar" />
        </span>
      )}
    </button>
  );
}
