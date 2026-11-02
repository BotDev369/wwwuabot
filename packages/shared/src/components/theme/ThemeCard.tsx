/**
 * `ThemeCard` — картка авторської теми, і вона ж її прев'ю.
 *
 * **Показує справжні токени, а не смужки зразків.** Картка ставить на себе
 * `data-theme` теми, яку показує, тож кожен рядок усередині — це та сама
 * палітра, яку отримає екран: поверхня, текст, акцент і його інверсний підпис.
 * Окрема таблиця «колір для прев'ю» розійшлася б із CSS на першій же правці.
 *
 * **Дотик — це застосування.** Окремої кнопки немає: вибір і так стає поточним.
 *
 * @module packages/shared/src/components/theme/ThemeCard
 */

import type { ReactElement } from "react";
import { fontStack } from "../../styles/fonts";
import type { ThemeDefinition } from "../../styles/registry";
import { Icon } from "../Icon";

export interface ThemeCardProps {
  theme: ThemeDefinition;
  /** Ця тема діє на екрані просто зараз. */
  applied?: boolean;
  onApply: () => void;
}

export function ThemeCard({ theme, applied = false, onApply }: ThemeCardProps): ReactElement {
  const family = fontStack(theme.display);

  return (
    <div className={`wb-theme-card${applied ? " wb-theme-card--on" : ""}`} data-theme={theme.id}>
      <button type="button" className="wb-theme-card-hit" onClick={onApply}>
        {/* Мініатюра — доказ, а не прикраса: дві репліки показують поверхню,
            текст і акцент разом, а заголовок — ще й шрифт теми. */}
        <span className="wb-theme-card-preview" aria-hidden="true">
          <span className="wb-theme-card-name" style={family ? { fontFamily: family } : undefined}>
            {theme.label}
          </span>
          <span className="wb-theme-card-bubble wb-theme-card-bubble--in">Привіт</span>
          <span className="wb-theme-card-bubble wb-theme-card-bubble--out">Ок</span>
        </span>

        <span className="wb-theme-card-foot">
          <span className="wb-theme-card-hint">{theme.hint}</span>
          {applied && (
            <span className="wb-theme-card-on">
              <Icon name="check" size={14} />
            </span>
          )}
        </span>
      </button>
    </div>
  );
}
