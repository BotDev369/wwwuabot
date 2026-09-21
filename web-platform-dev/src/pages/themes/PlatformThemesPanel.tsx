/**
 * «Платформа» — перша вкладка готових тем: перевірені трійки кольорів.
 *
 * **Готова тема міняє кольори, а не шрифт.** Шрифт людина вибрала сама, і
 * трійка кольорів не має права його забирати: «готове» — це швидкий старт, а не
 * повне перезаписування вибору.
 *
 * Вибір стає **одразу** (це той самий дотик, що і в панелі): прев'ю тут не
 * потрібне, бо весь застосунок і є прев'ю — людина бачить його на власні очі.
 *
 * @module web-platform-dev/src/pages/themes/PlatformThemesPanel
 */

import type { ReactElement } from "react";
import { COLOR_PRESETS, Icon, isPresetActive } from "@wwwuabot/shared";
import { useAppliedScheme } from "./useAppliedScheme";

export function PlatformThemesPanel(): ReactElement {
  const { applied, apply } = useAppliedScheme();

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
              apply({
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
