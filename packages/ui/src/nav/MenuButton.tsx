/**
 * `MenuButton` — вхід у навігацію: паляниця у своїй бульбашці, а без фото — смуги.
 *
 * Закрите меню показує її як є, відкрите — з другою лінією розрізу й тоном шапки.
 * Фото передає місце: знак продукту живе не в спільному компоненті.
 *
 * @module packages/ui/src/nav/MenuButton
 */

import type { ReactElement } from "react";

export interface MenuButtonProps {
  /** Меню відкрите: паляниця перерізана навхрест і тонована акцентом. */
  open?: boolean;
  onClick: () => void;
  /** Підпис для скрінрідера; за замовчуванням — «Меню». */
  label?: string;
  /**
   * Два кадри паляниці: закрите й відкрите меню. Без них — три смуги, як у
   * адмінки: знак місця, а не знак продукту.
   */
  photo?: { closed: string; open: string };
}

export function MenuButton({
  open = false,
  onClick,
  label = "Меню",
  photo,
}: MenuButtonProps): ReactElement {
  return (
    <button
      type="button"
      className={`wb-menubtn${photo ? " wb-menubtn--bread" : ""}`}
      aria-label={label}
      aria-expanded={open}
      data-open={open ? "true" : undefined}
      onClick={onClick}
    >
      {photo ? (
        <span className="wb-menubtn__bread" aria-hidden="true">
          {/* Кадри не змішуються: браузер має обидва, тож перемикання — без миготіння. */}
          <img src={open ? photo.open : photo.closed} alt="" draggable={false} />
          <span className="wb-menubtn__tint" />
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
