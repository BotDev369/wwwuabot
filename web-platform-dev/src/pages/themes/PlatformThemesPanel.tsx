/**
 * «Шаблони» — вкладка пункту «Кольори теми»: перевірені трійки кольорів.
 *
 * **Шаблон міняє кольори, а не шрифт.** Шрифт людина вибрала сама, і трійка
 * кольорів не має права його забирати: «готове» — це швидкий старт, а не
 * повне перезаписування вибору.
 *
 * Вибір іде **у чернетку панелі**, а не в пам'ять: застосовує його той самий
 * рядок «Відмінити / Застосувати», що й кольори, набрані вручну. Інакше в
 * меню було б два способи вирішити одне й те саме, а скасування не скасовувало
 * б нічого.
 *
 * @module web-platform-dev/src/pages/themes/PlatformThemesPanel
 */

import type { ReactElement } from "react";
import { COLOR_PRESETS, Icon, isPresetActive } from "@wwwuabot/shared";
import type { ApplicableScheme } from "@wwwuabot/shared/themes/apply";
import type { AppliedLook } from "./useAppliedScheme";

export interface PlatformThemesPanelProps {
  applied: AppliedLook;
  onApply: (scheme: ApplicableScheme) => void;
}

export function PlatformThemesPanel({ applied, onApply }: PlatformThemesPanelProps): ReactElement {
  return (
    <div className="wb-theme-presets">
      {COLOR_PRESETS.map((preset) => {
        const active = isPresetActive(preset, applied.colors);
        return (
          <button
            key={preset.id}
            type="button"
            aria-pressed={active}
            className={`wb-theme-preset${active ? " wb-theme-preset--active" : ""}`}
            onClick={() =>
              onApply({
                bg: preset.bg,
                text: preset.text,
                accent: preset.accent,
                font: applied.font,
              })
            }
          >
            <span className="wb-theme-preset-dots" aria-hidden="true">
              <span className="wb-theme-dot" style={{ background: preset.bg }} />
              <span className="wb-theme-dot" style={{ background: preset.text }} />
              <span className="wb-theme-dot" style={{ background: preset.accent }} />
            </span>
            <span className="wb-theme-preset-label">{preset.labelUk}</span>
            {/* Галочка — стан «це вибір зараз», а не кнопка */}
            {active && <Icon name="check" size={16} />}
          </button>
        );
      })}
    </div>
  );
}
