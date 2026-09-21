/**
 * Картка теми — те, як тема виглядає у списку.
 *
 * **Обличчя теми — її кольори**: три смуги на всю ширину. Назва каже, як
 * людина її назвала, але впізнають тему очима, тож кольори стоять першими й
 * найбільшими.
 *
 * **Один стан — одне слово.** Застосована тема каже це **чипом**, і кнопки
 * «Діє» в неї немає: дві позначки про те саме читаються як два різні факти.
 * Публічність — теж стан, і він теж чип.
 *
 * **Дії різні, бо різні права.** Свою тему можна змінити й прибрати, чужу —
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
  /** Своя тема: тоді видно і «правку», і «прибрати». */
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
  // Шрифт — частина теми, і про нього каже той самий рядок: «як у стилі»,
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
        {mine && scheme.isPublic && <span className="wb-badge">Публічна</span>}
        {applied && (
          <span className="wb-badge wb-badge-accent wb-theme-scheme-flag">
            <Icon name="check" size={12} />
            Застосовано
          </span>
        )}
      </div>

      <p className="wb-theme-scheme-meta">{font}</p>

      <div className="wb-theme-scheme-actions">
        {/* «Застосувати» — головна дія картки: усе решта тут допоміжне. Коли
            тема вже діє, кнопки немає — про це сказав чип. */}
        {!applied && (
          <button type="button" className="wb-btn wb-btn-primary wb-btn-sm" onClick={onApply}>
            <Icon name="check" size={16} />
            Застосувати
          </button>
        )}

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
