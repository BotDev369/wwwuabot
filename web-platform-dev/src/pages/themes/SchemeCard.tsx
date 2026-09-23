/**
 * Картка теми — те, як тема виглядає у списку.
 *
 * **Картка і є прев'ю.** Смуга із трьох зразків показувала кольори, але сам
 * вигляд теми доводилось уявляти — а уявити його можна рівно одним способом:
 * побачити. Тож тло картки — **тло самої теми**, текст — її текст, чип і кнопка
 * — її акцент: усе це приходить чотирма змінними (`--scheme-*`), а не окремими
 * кольорами в розмітці (`theme-pages.css`). Підпис на акценті бере
 * `onAccentColor` — та сама функція, що дає `--user-on-accent` живим кольорам.
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
 * **Мірка — компактна**: дві лінії, назва й підпис із дією. Тема в списку —
 * рядок, а не екран: застосована вона чи ні, видно з чипа, а роздивитись її
 * можна, застосувавши (у цьому й сенс прев'ю).
 *
 * @module web-platform-dev/src/pages/themes/SchemeCard
 */

import type { CSSProperties, ReactElement } from "react";
import { Icon, colorsMode, fontLabel, onAccentColor } from "@wwwuabot/shared";
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
  // Шрифт і світність — частина теми, і про них каже той самий рядок: «як у
  // стилі», коли родину не вибирали, і світла / темна — з її ж фону
  // (`colorsMode`), а не з нашої схеми: картка мусить описати тему, а не себе.
  const font = fontLabel(scheme.font) ?? "як у стилі";
  const shade = colorsMode(colors.bg) === "dark" ? "темна" : "світла";

  // Три кольори теми й підпис на її акценті — змінними: решта правил картки
  // (`theme-pages.css`) малюється ними, і в розмітці немає жодного кольору.
  const look = {
    "--scheme-bg": colors.bg,
    "--scheme-text": colors.text,
    "--scheme-accent": colors.accent,
    "--scheme-on-accent": onAccentColor(colors),
  } as CSSProperties;

  return (
    <div className="wb-theme-scheme" style={look}>
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

      <div className="wb-theme-scheme-foot">
        <p className="wb-theme-scheme-meta">
          {font} · {shade}
        </p>

        <div className="wb-theme-scheme-actions">
          {/* «Застосувати» — головна дія картки: усе решта тут допоміжне. Коли
              тема вже діє, кнопки немає — про це сказав чип. Залита вона
              **акцентом теми**: це третій із її трьох кольорів, і без кнопки
              його не було б видно. */}
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
    </div>
  );
}
