/**
 * Картка схеми — те, як схема виглядає у списку.
 *
 * **Обличчя схеми — її кольори**: три смуги на всю ширину. Назва каже, як
 * людина її назвала, але впізнають схему очима, тож кольори стоять першими й
 * найбільшими.
 *
 * **Дії різні, бо різні права.** Свою схему можна змінити й прибрати, чужу —
 * лише взяти собі. Кнопку, яка гарантовано не працює (сервер відповість 404,
 * бо власник стоїть у `WHERE`), показувати не можна: це обіцянка, а не дія
 * (AGENTS.md §7).
 *
 * @module web-platform-dev/src/pages/themes/SchemeCard
 */

import type { ReactElement } from "react";
import { Icon, fontLabel } from "@wwwuabot/shared";
import { themeSchemeColors, type ThemeScheme } from "@wwwuabot/shared/themes";

export interface SchemeCardProps {
  scheme: ThemeScheme;
  /** Вона діє на екрані просто зараз. */
  applied: boolean;
  /** Своя схема: тоді видно і «правку», і «прибрати». */
  mine: boolean;
  onApply: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
}

export function SchemeCard({
  scheme,
  applied,
  mine,
  onApply,
  onEdit,
  onRemove,
}: SchemeCardProps): ReactElement {
  const colors = themeSchemeColors(scheme);
  // Шрифт — частина схеми, і про нього каже той самий рядок: «як у стилі»,
  // коли родину не вибирали.
  const font = fontLabel(scheme.font) ?? "як у стилі";

  return (
    <div className="wb-theme-scheme">
      <div className="wb-theme-scheme-preview" aria-hidden="true">
        <span style={{ background: colors.bg }} />
        <span style={{ background: colors.text }} />
        <span style={{ background: colors.accent }} />
      </div>

      <div className="wb-theme-scheme-head">
        <span className="wb-theme-scheme-name">{scheme.name}</span>
        {applied && (
          <span className="wb-badge wb-badge-accent wb-theme-scheme-flag">
            <Icon name="check" size={12} />
            Застосовано
          </span>
        )}
      </div>

      <p className="wb-theme-scheme-meta">
        Шрифт: {font}
        {mine && scheme.isPublic ? " · доступна іншим" : ""}
      </p>

      <div className="wb-theme-scheme-actions">
        {/* «Застосувати» — головна дія картки: усе решта тут допоміжне. */}
        <button
          type="button"
          className={`wb-btn wb-btn-sm ${applied ? "wb-btn-secondary" : "wb-btn-primary"}`}
          onClick={onApply}
          disabled={applied}
        >
          <Icon name="check" size={16} />
          {applied ? "Діє" : "Застосувати"}
        </button>

        {mine && onEdit && (
          <button type="button" className="wb-btn wb-btn-secondary wb-btn-sm" onClick={onEdit}>
            <Icon name="edit" size={16} />
            Змінити
          </button>
        )}

        {mine && onRemove && (
          <button
            type="button"
            className="wb-btn wb-btn-secondary wb-btn-sm wb-btn-danger"
            onClick={onRemove}
          >
            <Icon name="trash" size={16} />
            Прибрати
          </button>
        )}
      </div>
    </div>
  );
}
