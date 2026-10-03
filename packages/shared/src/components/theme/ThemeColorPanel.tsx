/**
 * `ThemeColorPanel` — панель вигляду: що в застосунку виглядає так, а не як.
 *
 * Це єдина поверхня вигляду в обох оболонках (платформа відкриває її меню з
 * хедера, адмінка — кнопкою в бічному меню), і саме тому вона живе в `shared`:
 * два різні «вибір кольору» розійшлися б на першій же правці.
 *
 * **Два пункти, і це межа:** «Кольори теми» та «Шрифт теми». Стиль продукту
 * (Material) вибором не є — він константа, тож третього пункту тут немає
 * (`./registry`).
 *
 * **Панель — це вибір, а не редактор.** Тому всередині пункту «Кольори теми»
 * немає рядків «фон / основний / акцент»: там лише джерела (вкладки платформи
 * або готові палітри адмінки) і «Налаштувати власну». Точне налаштування
 * одного кольору живе в редакторі теми (`ThemeEditorModal`) — два місця для
 * одного кольору розійшлися б на першій же правці.
 *
 * Кожен пункт — акордеон (`ThemeSection`) із **другим рядком «що обрано»**, а
 * перший відкритий одразу: за кольори приходять частіше, і згорнутий список із
 * двома написаними заголовками нічого не каже про вибір.
 *
 * **Рядка дій тут немає.** Натиснули палітру, схему чи шрифт — вибір **уже**
 * поточна тема: на екрані й у пам'яті пристрою («Застосувати» не потрібна).
 * Колись вона була, і це коштувало реального вибору: панель закривали, а
 * чернетка зникала — тема не застосовувалася. Закриває панель той, хто її
 * відкрив (`onClose` на оболонці).
 *
 * @module packages/shared/src/components/theme/ThemeColorPanel
 */

import type { ReactElement, ReactNode } from "react";
import { COLOR_PRESETS, isPresetActive, type ColorPreset } from "../../styles/color-presets";
import type { ColorDraft } from "../../styles/user-colors";
import { fontLabel, STYLE_FONT_LABEL } from "../../styles/fonts";
import { FontPicker } from "./FontPicker";
import { ThemeSection } from "./ThemeSection";
import { useFontChoice } from "./useFontChoice";
import { useUserColors } from "./useUserColors";

export interface ThemeColorPanelProps {
  /** Що стоїть у пункті «Кольори теми» замість готових палітр (вкладки платформи). */
  colorsBody?: ReactNode;
  /** Другий рядок пункту «Кольори теми»: що обрано зараз. */
  colorsHint?: ReactNode;
  /** Кнопка в кінці пункту «Кольори теми» («Налаштувати власну»). */
  colorsExtra?: ReactNode;
}

export function ThemeColorPanel({
  colorsBody,
  colorsHint,
  colorsExtra,
}: ThemeColorPanelProps): ReactElement {
  const colors = useUserColors();
  const fonts = useFontChoice();

  return (
    <div className="wb-theme-panel">
      <ThemeSection title="Кольори теми" hint={colorsHint} defaultOpen>
        {colorsBody ?? <PresetGrid current={colors.current} onPick={colors.applyPreset} />}

        {colorsExtra && <div className="wb-theme-extra">{colorsExtra}</div>}
      </ThemeSection>

      <ThemeSection title="Шрифт теми" hint={fontLabel(fonts.current) ?? STYLE_FONT_LABEL}>
        <FontPicker value={fonts.current} onChange={fonts.setFont} />
      </ThemeSection>

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
    <div className="wb-theme-presets">
      {COLOR_PRESETS.map((preset) => {
        const active = isPresetActive(preset, current);
        return (
          <button
            key={preset.id}
            type="button"
            className={`wb-theme-preset${active ? " wb-theme-preset--active" : ""}`}
            aria-pressed={active}
            onClick={() => onPick(preset)}
          >
            <span className="wb-theme-preset-dots" aria-hidden="true">
              <span className="wb-theme-dot" style={{ background: preset.bg }} />
              <span className="wb-theme-dot" style={{ background: preset.text }} />
              <span className="wb-theme-dot" style={{ background: preset.accent }} />
            </span>
            <span className="wb-theme-preset-label">{preset.labelUk}</span>
          </button>
        );
      })}
    </div>
  );
}
