/**
 * `ThemeColorPanel` — панель «Тема»: три кольори, які задає людина.
 *
 * Це єдина поверхня теми в обох оболонках (платформа відкриває її з меню
 * профілю, адмінка — кнопкою в бічному меню), і саме тому вона живе в
 * `shared`: два різні «вибір кольору» розійшлися б на першій же правці.
 *
 * Порядок блоків — той, у якому людина думає: спершу **готові палітри** (одним
 * дотиком отримати робочий набір), потім **свої три кольори** з повзунками,
 * потім **дії**. Характер (Apple / Android) стоїть окремо й нижче: він не
 * колір, і змішувати його з кольорами — це знову робити «світла / темна».
 *
 * Червоного «не можна» тут немає: панель **називає**, якого кольору бракує, і
 * кнопка збереження просто неактивна. Порожній слот — це стан, який видно.
 *
 * @module packages/shared/src/components/theme/ThemeColorPanel
 */

import { useState, type ReactElement } from "react";
import { Icon } from "../Icon";
import { COLOR_PRESETS, isPresetActive } from "../../styles/color-presets";
import { COLOR_SLOTS, type ColorSlot } from "../../styles/user-colors";
import { ColorSlotRow } from "./ColorSlotRow";
import { useStyleTheme } from "./useStyleTheme";
import { useUserColors } from "./useUserColors";

export interface ThemeColorPanelProps {
  /** Вибір записано в локальну пам'ять (оболонка, наприклад, закриває панель). */
  onSaved?: () => void;
}

export function ThemeColorPanel({ onSaved }: ThemeColorPanelProps): ReactElement {
  const colors = useUserColors();
  const { brand, setBrand, brands } = useStyleTheme();
  const [openSlot, setOpenSlot] = useState<ColorSlot | null>("bg");

  const handleSave = () => {
    colors.save();
    onSaved?.();
  };

  return (
    <div className="wb-theme-panel">
      <section className="wb-theme-section">
        <h3 className="wb-theme-section-title">Готові палітри</h3>
        <div className="wb-theme-presets">
          {COLOR_PRESETS.map((preset) => {
            const active = isPresetActive(preset, colors.draft);
            return (
              <button
                key={preset.id}
                type="button"
                className={`wb-theme-preset${active ? " wb-theme-preset--active" : ""}`}
                aria-pressed={active}
                onClick={() => colors.applyPreset(preset)}
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
      </section>

      <section className="wb-theme-section">
        <h3 className="wb-theme-section-title">Твої три кольори</h3>
        <p className="wb-theme-hint">
          Колір можна взяти з палітри, повзунком або кодом. Коли задані всі три, застосунок
          малюється ними одразу — і тоді ж стає доступним «Зберегти».
        </p>
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
      </section>

      <section className="wb-theme-section">
        <h3 className="wb-theme-section-title">Характер</h3>
        <div className="wb-theme-brands">
          {brands.map((definition) => {
            const active = definition.id === brand;
            return (
              <button
                key={definition.id}
                type="button"
                className={`wb-btn wb-btn-sm${active ? " wb-btn-primary" : " wb-btn-secondary"}`}
                aria-pressed={active}
                onClick={() => setBrand(definition.id)}
              >
                {definition.labelUk}
              </button>
            );
          })}
        </div>
      </section>

      {colors.missing.length > 0 && (
        <p className="wb-theme-hint wb-theme-hint--warn">
          Порожні кольори: {colors.missing.join(", ")}. Без них зберегти не вийде.
        </p>
      )}
      {colors.warning && <p className="wb-theme-hint wb-theme-hint--warn">{colors.warning}</p>}

      <div className="wb-sheet-actions">
        <button
          type="button"
          className="wb-btn wb-btn-secondary wb-btn-sm"
          onClick={colors.reset}
          disabled={!colors.saved}
        >
          <Icon name="refresh" size={16} />
          Скинути
        </button>
        <button
          type="button"
          className="wb-btn wb-btn-primary wb-btn-sm"
          onClick={handleSave}
          disabled={!colors.complete || !colors.dirty}
        >
          <Icon name="check" size={16} />
          Зберегти
        </button>
      </div>
    </div>
  );
}
