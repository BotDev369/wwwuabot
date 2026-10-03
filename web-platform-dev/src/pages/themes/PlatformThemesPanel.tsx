/**
 * «Шаблони» — вкладка пункту «Кольори теми»: перевірені трійки кольорів.
 *
 * **Шаблон — це тема, а не трійка кольорів.** Він несе й шрифт: усі шаблони
 * мають **шрифт проєкту** (`PRESET_FONT`), тож картка показує його, і дотик
 * застосовує всю схему, а не тільки кольори.
 *
 * **Картка — та сама, що й у вкладках бібліотек** (`ThemeCard`): шаблон і тема
 * людини це один рядок вибору, тож різні картки для них означали б два списки
 * замість одного.
 *
 * @module web-platform-dev/src/pages/themes/PlatformThemesPanel
 */

import type { ReactElement } from "react";
import { COLOR_PRESETS, isPresetActive, ThemeCard } from "@wwwuabot/shared";
import type { ApplicableScheme } from "@wwwuabot/shared/themes/apply";
import type { AppliedLook } from "./useAppliedScheme";

export interface PlatformThemesPanelProps {
  applied: AppliedLook;
  onApply: (scheme: ApplicableScheme) => void;
}

export function PlatformThemesPanel({ applied, onApply }: PlatformThemesPanelProps): ReactElement {
  return (
    <div className="wb-theme-cards">
      {COLOR_PRESETS.map((preset) => (
        <ThemeCard
          key={preset.id}
          name={preset.labelUk}
          colors={preset}
          font={preset.font}
          applied={isPresetActive(preset, applied.colors)}
          onApply={() =>
            onApply({
              bg: preset.bg,
              text: preset.text,
              accent: preset.accent,
              font: preset.font,
            })
          }
        />
      ))}
    </div>
  );
}
