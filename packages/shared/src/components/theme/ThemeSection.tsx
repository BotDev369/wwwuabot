/**
 * `ThemeSection` — акордеон секції панелі «Тема».
 *
 * Спершу панель показувала все одразу, і на телефоні це був довгий список: поки
 * доїдеш до «Готових палітр», уже забув, що було зверху. Акордеон дає оку три
 * назви замість трьох екранів — і **всі закриті**, бо відкрита секція це не
 * стан, а вибір людини.
 *
 * Розмітка та сама, що в рядка кольору (`ColorSlotRow`): залитий рядок на всю
 * ширину + каретка. Це один кирпичик «натисни й розкрий», і друга його форма
 * тут була б зайвою.
 *
 * @module packages/shared/src/components/theme/ThemeSection
 */

import { useState, type ReactElement, type ReactNode } from "react";
import { Icon } from "../Icon";

interface ThemeSectionProps {
  /** Назва секції — вона ж підпис кнопки. */
  title: string;
  /** Зміст: рендериться лише коли секція відкрита. */
  children: ReactNode;
}

export function ThemeSection({ title, children }: ThemeSectionProps): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <section className={`wb-theme-section${open ? " wb-theme-section--open" : ""}`}>
      <button
        type="button"
        className="wb-theme-section-head"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="wb-theme-section-title">{title}</span>
        <span className="wb-theme-section-caret">
          <Icon name={open ? "chevron-up" : "chevron-down"} size={18} />
        </span>
      </button>
      {open && <div className="wb-theme-section-body">{children}</div>}
    </section>
  );
}
