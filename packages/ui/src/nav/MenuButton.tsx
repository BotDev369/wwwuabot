/**
 * `MenuButton` — гамбургер платформи: три смуги різної довжини, середня
 * акцентна; відкрите меню — хрестик. Та сама мова, що й три рівні смуги, лише
 * з власним характером.
 *
 * @module packages/ui/src/nav/MenuButton
 */

import type { ReactElement } from "react";

export interface MenuButtonProps {
  /** Меню відкрите: смуги складаються в хрестик. */
  open?: boolean;
  onClick: () => void;
  /** Підпис для скрінрідера; за замовчуванням — «Меню». */
  label?: string;
}

export function MenuButton({
  open = false,
  onClick,
  label = "Меню",
}: MenuButtonProps): ReactElement {
  return (
    <button
      type="button"
      className="wb-menubtn"
      aria-label={label}
      aria-expanded={open}
      data-open={open ? "true" : undefined}
      onClick={onClick}
    >
      <span className="wb-menubtn__bars" aria-hidden="true">
        <span className="wb-menubtn__bar" />
        <span className="wb-menubtn__bar" />
        <span className="wb-menubtn__bar" />
      </span>
    </button>
  );
}
