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
 * Кожен пункт — акордеон (`ThemeSection`) із **другим рядком «що обрано»**, а
 * перший відкритий одразу: за кольори приходять частіше, і згорнутий список із
 * двома написаними заголовками нічого не каже про вибір.
 *
 * **Останній рядок — «Відмінити» / «Застосувати».** Вибір лягає на екран
 * живцем, тож «Застосувати» — це запис у пам'ять пристрою, а «Відмінити» —
 * вихід без запису: обидва хуки повертають збережене при розмонтуванні, тож це
 * два дотики з одним результатом, а не три кнопки з трьома станами.
 *
 * Червоного «не можна» тут немає: панель **називає**, якого кольору бракує, і
 * кнопка застосування просто неактивна. Порожній слот — це стан, який видно.
 *
 * @module packages/shared/src/components/theme/ThemeColorPanel
 */

import { useState, type ReactElement, type ReactNode } from "react";
import { Icon } from "../Icon";
import { COLOR_PRESETS, isPresetActive, type ColorPreset } from "../../styles/color-presets";
import { COLOR_SLOTS, type ColorDraft, type ColorSlot } from "../../styles/user-colors";
import { fontLabel, STYLE_FONT_LABEL } from "../../styles/fonts";
import { ColorSlotRow } from "./ColorSlotRow";
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
  // Відкритий рівно один рядок кольору: три розкриті повзунки на телефоні — це
  // екран, у якому нічого не видно.
  const [openSlot, setOpenSlot] = useState<ColorSlot | null>(null);
  // Схема — це три кольори **і** шрифт: незбереженим вона стає від кожного з них.
  const dirty = colors.dirty || fonts.dirty;

  return (
    <div className="wb-theme-panel">
      <ThemeSection title="Кольори теми" hint={colorsHint} defaultOpen>
        <div className="wb-theme-rows">
          {COLOR_SLOTS.map((slot) => (
            <ColorSlotRow
              key={slot.id}
              slot={slot}
              value={colors.draft[slot.id] ?? ""}
              expanded={openSlot === slot.id}
              onToggle={() => setOpenSlot(openSlot === slot.id ? null : slot.id)}
              onChange={(value) => colors.setSlot(slot.id, value)}
            />
          ))}
        </div>

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

      {/* Що саме станеться з натиснутою кнопкою — рядком, а не кольором кнопки:
          «Застосовано» тут означає, що вибір уже в пам'яті пристрою. */}
      {colors.complete && (
        <p className={`wb-theme-status${dirty ? "" : " wb-theme-status--saved"}`}>
          <Icon name={dirty ? "edit" : "check"} size={16} />
          {dirty ? "Незбережені зміни" : "Застосовано на цьому пристрої"}
        </p>
      )}

      <div className="wb-sheet-actions wb-theme-actions">
        <button type="button" className="wb-btn wb-btn-secondary wb-btn-sm" onClick={onClose}>
          Відмінити
        </button>
        <button
          type="button"
          className="wb-btn wb-btn-primary wb-btn-sm"
          disabled={!colors.complete}
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
