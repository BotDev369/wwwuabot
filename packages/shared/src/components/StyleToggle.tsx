/**
 * `ThemeButton` — кнопка «Тема» в бічному меню (адмінка) і в блоках сторінки.
 *
 * Поверхня — та сама, що в платформи: спільний `ThemeSheet` із спільною
 * `ThemeColorPanel` («три колори»), лише відкрита з іншого місця. Світлої /
 * темної більше немає: світлоту виводить сам продукт із **фону**, який задала
 * людина.
 *
 * Розмітку поверхні тут не тримають: вона одна на продукт (`ThemeSheet`), бо
 * два однакові аркуші розійшлися б по відступах, тінях і безпечних зонах —
 * а саме цим адмінка колись відрізнялась від платформи.
 *
 * `useStyleTheme` лишається публічним із цього файлу: ним користуються блоки
 * сторінки (`ThemeBlock`, `ThemeToggleBlock`) та обидві оболонки.
 *
 * @module packages/shared/src/components/StyleToggle
 */

import { useCallback, useState, type ReactElement } from "react";
import { Icon } from "./Icon";
import { ThemeSheet } from "./theme";

export { useStyleTheme } from "./theme";

export function ThemeButton({ compact = false }: { compact?: boolean }): ReactElement {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

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

      {open && <ThemeSheet onClose={close} />}
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
