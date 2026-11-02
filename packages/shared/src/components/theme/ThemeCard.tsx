/**
 * `ThemeCard` — картка авторської теми, і вона ж її мікро-демо.
 *
 * **Показує справжні токени, а не підпис.** Картка ставить на себе `data-theme`
 * теми, яку показує, тож кожен елемент усередині — це та сама палітра, яку
 * отримає екран. Назви й опису на картці немає: вигляд і є доказом, а слово
 * «Папір» над кремовою плиткою лише повторювало те, що видно.
 *
 * **Видно всі кольори теми, а не два.** Мініятюра — це маленький екран: два
 * рядки тексту (основний і приглушений), шість стовпців даних, акцентна дія й
 * три статуси. Поверхні показують самі плитки — картка, аркуш усередині й
 * смуга під ними. Тому з картки читається вся палітра, а не «привіт — ок».
 *
 * **Шрифт не показуємо, бо тема його не міняє:** типографіка продукту одна на
 * всі теми, і картка не має натякати на вибір, якого немає.
 *
 * **Дотик — це застосування.** Окремої кнопки немає: вибір і так стає поточним.
 * Підпис для читача екрана лишається — `aria-label` із назвою теми, бо
 * візуально назви більше немає.
 *
 * @module packages/shared/src/components/theme/ThemeCard
 */

import type { ReactElement } from "react";
import type { ThemeDefinition } from "../../styles/registry";
import { Icon } from "../Icon";

export interface ThemeCardProps {
  theme: ThemeDefinition;
  /** Ця тема діє на екрані просто зараз. */
  applied?: boolean;
  onApply: () => void;
}

/** Стовпці даних: шість ролей палітри стоять у кожній темі. */
const DATA_BARS = [1, 2, 3, 4, 5, 6] as const;

/** Статуси: три кольори, які тема задає окремо від даних. */
const STATUS_DOTS = ["green", "yellow", "red"] as const;

export function ThemeCard({ theme, applied = false, onApply }: ThemeCardProps): ReactElement {
  return (
    <div className={`wb-theme-card${applied ? " wb-theme-card--on" : ""}`} data-theme={theme.id}>
      <button
        type="button"
        className="wb-theme-card-hit"
        onClick={onApply}
        aria-pressed={applied}
        aria-label={`Тема «${theme.label}»`}
      >
        {/* Мініятюра — доказ, а не прикраса: вона показує поверхні, текст,
            шість кольорів даних, акцент і статуси однією плиткою. */}
        <span className="wb-theme-card-scene" aria-hidden="true">
          <span className="wb-theme-card-sheet">
            <span className="wb-theme-card-line" />
            <span className="wb-theme-card-line wb-theme-card-line--short" />
            <span className="wb-theme-card-bars">
              {DATA_BARS.map((bar) => (
                <span key={bar} className={`wb-theme-card-bar wb-theme-card-bar--${bar}`} />
              ))}
            </span>
          </span>

          <span className="wb-theme-card-actions">
            <span className="wb-theme-card-action" />
            <span className="wb-theme-card-dots">
              {STATUS_DOTS.map((dot) => (
                <span key={dot} className={`wb-theme-card-dot wb-theme-card-dot--${dot}`} />
              ))}
            </span>
          </span>
        </span>

        {applied && (
          <span className="wb-theme-card-on">
            <Icon name="check" size={14} />
          </span>
        )}
      </button>
    </div>
  );
}
