/**
 * `ThemeCard` — картка авторської теми, і вона ж її палітра.
 *
 * **На картці лише колір.** Ні назви, ні опису, ні рядків-заглушок, ні рамок
 * екрана: у шести темах вони однакові, тобто малювали б самі себе. Між темами
 * відрізняється рівно одне — колір, і картка показує тільки його.
 *
 * **Кожен колір теми — рівно один зразок.** Не «один зразок на токен»: у межах
 * теми частина ролей має той самий колір (`--accent` = `--data-1`, `--bg-1` →
 * `--bg-0`), і два однакові зразки читались як помилка. Тому зразки приходять
 * із `theme-palette.json`, який виводить `npm run doc:style`: повторений колір
 * лишає на картці одного представника.
 *
 * **Чого в палітрі немає.** Токени-посилання показані раз, своїм джерелом;
 * прозорі шари (`--hairline`, `*-dim`, `--modal-scrim`) окремим зразком нічого
 * не кажуть — під ними мусить бути поверхня; хром контролів і скріма
 * (`--switch-knob`, `--text-on-scrim`) — не палітра екрана.
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
import palette from "../../styles/theme-palette.json";
import { Icon } from "../Icon";

export interface ThemeCardProps {
  theme: ThemeDefinition;
  /** Ця тема діє на екрані просто зараз. */
  applied?: boolean;
  onApply: () => void;
}

const ROLES = palette.roles as readonly string[];
const SWATCHES = palette.themes as Record<string, readonly string[]>;

/**
 * Зразки теми: кожен її колір рівно раз.
 *
 * Тема без палітри в CSS (нова в реєстрі, ще не пофарбована) показує всі ролі —
 * картка мусить лишитись палітрою, а не порожнечею. Те, що кожна тема реєстру
 * має свій набір, стереже `ThemeCard.test.tsx`.
 */
export function themeSwatches(themeId: string): readonly string[] {
  return SWATCHES[themeId] ?? ROLES;
}

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
        {/* Палітра — доказ, а не прикраса: кожен зразок це справжній токен
            теми, і понад кольори на картці нічого немає. */}
        <span className="wb-theme-card-palette" aria-hidden="true">
          {themeSwatches(theme.id).map((token) => (
            <span key={token} className={`wb-theme-card-chip wb-theme-card-chip--${token}`} />
          ))}
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
