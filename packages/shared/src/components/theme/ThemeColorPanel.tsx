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
 * **Останній рядок — «Відмінити» / «Застосувати».** Вибір лягає на екран
 * живцем, тож «Застосувати» — це запис у пам'ять пристрою, а «Відмінити» —
 * вихід без запису: обидва хуки повертають збережене при розмонтуванні, тож це
 * два дотики з одним результатом, а не три кнопки з трьома станами.
 *
 * **«Застосувати» активна лише тоді, коли є що записати** (чернетка відрізняється
 * від збереженого): синя кнопка, на яку можна натиснути без змін, обіцяє дію, якої
 * не буде. Стан зміни показує вона сама — окремий рядок «Застосовано на цьому
 * пристрої» повторював одне й те саме й нічого не додавав.
 *
 * @module packages/shared/src/components/theme/ThemeColorPanel
 */

import type { ReactElement, ReactNode } from "react";
import { Icon } from "../Icon";
import { COLOR_PRESETS, isPresetActive, type ColorPreset } from "../../styles/color-presets";
import type { ColorDraft } from "../../styles/user-colors";
import { fontLabel, STYLE_FONT_LABEL } from "../../styles/fonts";
import { FontPicker } from "./FontPicker";
import { ThemeSection } from "./ThemeSection";
import { useFontChoice } from "./useFontChoice";
import { useUserColors } from "./useUserColors";

export interface ThemeColorPanelProps {
  /**
   * Закрити поверхню. Панель не знає, чим відкрита (меню хедера в платформі чи
   * кнопка адмінки), тож закриває її той, хто відкрив: і «Відмінити», і
   * «Застосувати» ведуть сюди.
   */
  onClose: () => void;
  /** Що стоїть у пункті «Кольори теми» замість готових палітр (вкладки платформи). */
  colorsBody?: ReactNode;
  /** Другий рядок пункту «Кольори теми»: що обрано зараз. */
  colorsHint?: ReactNode;
  /** Кнопка в кінці пункту «Кольори теми» («Налаштувати власну»). */
  colorsExtra?: ReactNode;
}

export function ThemeColorPanel({
  onClose,
  colorsBody,
  colorsHint,
  colorsExtra,
}: ThemeColorPanelProps): ReactElement {
  const colors = useUserColors();
  const fonts = useFontChoice();
  // Схема — це три кольори **і** шрифт: незбереженим вона стає від кожного з них.
  const dirty = colors.dirty || fonts.dirty;

  return (
    <div className="wb-theme-panel">
      <ThemeSection title="Кольори теми" hint={colorsHint} defaultOpen>
        {colorsBody ?? <PresetGrid draft={colors.draft} onPick={colors.applyPreset} />}

        {colorsExtra && <div className="wb-theme-extra">{colorsExtra}</div>}
      </ThemeSection>

      <ThemeSection title="Шрифт теми" hint={fontLabel(fonts.draft) ?? STYLE_FONT_LABEL}>
        <FontPicker value={fonts.draft} onChange={fonts.setFont} />
      </ThemeSection>

      {colors.missing.length > 0 && (
        <p className="wb-theme-hint wb-theme-hint--warn">
          Порожні кольори: {colors.missing.join(", ")}. Без них застосувати не вийде.
        </p>
      )}
      {colors.warning && <p className="wb-theme-hint wb-theme-hint--warn">{colors.warning}</p>}

      <div className="wb-sheet-actions wb-theme-actions">
        <button type="button" className="wb-btn wb-btn-secondary wb-btn-sm" onClick={onClose}>
          Відмінити
        </button>
        {/* Акцентна — лише коли є зміни: колір кнопки й каже «записати», тож
            без змін він мовчить, а не пропонує порожню дію. */}
        <button
          type="button"
          className={`wb-btn wb-btn-sm${dirty ? " wb-btn-primary" : " wb-btn-secondary"}`}
          disabled={!colors.complete || !dirty}
          onClick={() => {
            colors.save();
            fonts.save();
            onClose();
          }}
        >
          <Icon name="check" size={16} />
          Застосувати
        </button>
      </div>
    </div>
  );
}

/** Готові палітри — різновид кольорів за одним дотиком (адмінка, без вкладок). */
function PresetGrid({
  draft,
  onPick,
}: {
  draft: ColorDraft;
  onPick: (preset: ColorPreset) => void;
}): ReactElement {
  return (
    <div className="wb-theme-presets">
      {COLOR_PRESETS.map((preset) => {
        const active = isPresetActive(preset, draft);
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
