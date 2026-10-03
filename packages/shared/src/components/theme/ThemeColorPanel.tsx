/**
 * `ThemeColorPanel` — панель вигляду: що в застосунку виглядає так, а не як.
 *
 * Це єдина поверхня вигляду в обох оболонках (платформа відкриває її меню з
 * хедера, адмінка — кнопкою в бічному меню), і саме тому вона живе в `shared`:
 * два різні «вибір кольору» розійшлися б на першій же правці.
 *
 * **Панель — це вибір, а не редактор.** Усередині немає рядків «фон / основний /
 * акцент» і немає вибору шрифту: точне налаштування і кольорів, і шрифту живе
 * в редакторі теми (`ThemeEditorModal`) — два місця для одного кольору
 * розійшлися б на першій же правці. Секція шрифту тут була окремим налаштуванням
 * тієї самої схеми, тож дві кнопки могли казати про різне.
 *
 * **Акордеона тут немає:** коли пункт один, рамка з кареткою лише приховує його.
 * Назва поверхні («Тема») і вкладки кажуть, що це за вибір, досить.
 *
 * **Дублю обраної теми теж немає.** Раніше другий рядок пункту показував
 * «· Лаванда», а поруч стояла картка «Лаванда» з галочкою: дві позначки однієї
 * правди. Тепер про обране каже **лише** виділення картки.
 *
 * @module packages/shared/src/components/theme/ThemeColorPanel
 */

import type { ReactElement, ReactNode } from "react";
import { COLOR_PRESETS, isPresetActive, type ColorPreset } from "../../styles/color-presets";
import type { ColorDraft } from "../../styles/user-colors";
import { ThemeCard } from "./ThemeCard";
import { useUserColors } from "./useUserColors";

export interface ThemeColorPanelProps {
  /** Що стоїть у панелі замість готових палітр (вкладки платформи). */
  colorsBody?: ReactNode;
  /** Кнопка в кінці панелі («Налаштувати власну»). */
  colorsExtra?: ReactNode;
}

export function ThemeColorPanel({ colorsBody, colorsExtra }: ThemeColorPanelProps): ReactElement {
  const colors = useUserColors();

  return (
    <div className="wb-theme-panel">
      {colorsBody ?? <PresetGrid current={colors.current} onPick={colors.applyPreset} />}

      {colorsExtra && <div className="wb-theme-extra">{colorsExtra}</div>}

      {/* Неповна палітра ніде не записується, тож кажемо прямо: тема лишиться
          попередньою, поки не вибрано усіх трьох. */}
      {colors.missing.length > 0 && (
        <p className="wb-theme-hint wb-theme-hint--warn">
          Порожні кольори: {colors.missing.join(", ")}. Тема лишиться попередньою, поки не вибереш
          усі три.
        </p>
      )}
      {colors.warning && <p className="wb-theme-hint wb-theme-hint--warn">{colors.warning}</p>}
    </div>
  );
}

/** Готові палітри — різновид кольорів за одним дотиком (адмінка, без вкладок). */
function PresetGrid({
  current,
  onPick,
}: {
  current: ColorDraft;
  onPick: (preset: ColorPreset) => void;
}): ReactElement {
  return (
    <div className="wb-theme-cards">
      {COLOR_PRESETS.map((preset) => (
        <ThemeCard
          key={preset.id}
          name={preset.labelUk}
          colors={preset}
          font={preset.font}
          applied={isPresetActive(preset, current)}
          onApply={() => onPick(preset)}
        />
      ))}
    </div>
  );
}
