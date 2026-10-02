/**
 * `ThemeSection` — акордеон пункту панелі вигляду.
 *
 * Спершу панель показувала все одразу, і на телефоні це був довгий список: поки
 * доїдеш до кольорів, уже забув, що було зверху. Акордеон дає оку назви замість
 * довгого екрана.
 *
 * **Голова пункту — це і є меню:** назва («що обираємо») другим рядком і те, що
 * обрано зараз («Кольори теми → “Ніч у Львові”», «Шрифт теми → “Lora”»). Тому
 * людина бачить свій вибір, не розкриваючи пункт, — і точно знає, який розкрити.
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
  /** Другий рядок: що обрано зараз (назва теми, шрифт). */
  hint?: ReactNode;
  /** Розкрити одразу — для пункту, за яким приходять найчастіше. */
  defaultOpen?: boolean;
  /** Зміст: рендериться лише коли секція відкрита. */
  children: ReactNode;
}

export function ThemeSection({
  title,
  hint,
  defaultOpen = false,
  children,
}: ThemeSectionProps): ReactElement {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`wb-theme-section${open ? " wb-theme-section--open" : ""}`}>
      <button
        type="button"
        className="wb-theme-section-head"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="wb-theme-section-text">
          <span className="wb-theme-section-title">{title}</span>
          {hint && <span className="wb-theme-section-hint">{hint}</span>}
        </span>
        <span className="wb-theme-section-caret">
          <Icon name={open ? "chevron-up" : "chevron-down"} size={18} />
        </span>
      </button>
      {open && <div className="wb-theme-section-body">{children}</div>}
    </section>
  );
}
