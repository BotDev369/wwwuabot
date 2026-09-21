/**
 * `ThemeColorPanel` — панель «Тема»: три кольори, які задає людина.
 *
 * Це єдина поверхня теми в обох оболонках (платформа відкриває її з меню
 * профілю, адмінка — кнопкою в бічному меню), і саме тому вона живе в
 * `shared`: два різні «вибір кольору» розійшлися б на першій же правці.
 *
 * Порядок блоків — від загального до часткового: спершу **Стиль** (характер
 * Apple / Material — уся оболонка на один дотик), потім **Кольори теми** (те,
 * що людина налаштовує найчастіше), і аж унизу **Готові палітри** — вони не
 * налаштування, а швидкий старт, і зверху вони забирали екран у того, за чим
 * прийшли.
 *
 * Кожна секція — закритий акордеон (`ThemeSection`): панель показує три назви,
 * а не суцільний стовп. Пояснень усередині немає — підказки лишились там, де
 * вони щось міняють (порожні слоти й нечитабельний вибір).
 *
 * **Стан збереження видно рядком** (`.wb-theme-status`): «Незбережені зміни» →
 * «Збережено». Без нього кнопка, що просто сіріє, читається як «не спрацювала»,
 * а людина не знає, чи вибір лишився. Заодно це причина, чому кнопок дві:
 * **«Зберегти»** лишає панель відкритою (щоб стан було видно й можна було
 * доправити), а **«Зберегти і закрити»** — це те саме плюс вихід: два дотики
 * замість двох дій.
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
import { FontPicker } from "./FontPicker";
import { ThemeSection } from "./ThemeSection";
import { useFontChoice } from "./useFontChoice";
import { useStyleTheme } from "./useStyleTheme";
import { useUserColors } from "./useUserColors";

export interface ThemeColorPanelProps {
  /**
   * Закрити поверхню. Потрібна кнопці «Зберегти і закрити»: сама панель не знає,
   * чим відкрита (меню профілю чи модалка адмінки), і закриває її той, хто
   * відкрив.
   */
  onClose?: () => void;
}

export function ThemeColorPanel({ onClose }: ThemeColorPanelProps): ReactElement {
  const colors = useUserColors();
  const fonts = useFontChoice();
  const { brand, setBrand, brands } = useStyleTheme();
  // Відкритих слотів немає: акордеони закриті, доки їх не розкриють.
  const [openSlot, setOpenSlot] = useState<ColorSlot | null>(null);
  // Схема — це три кольори **і** шрифт: незбереженим вона стає від кожного з них.
  const dirty = colors.dirty || fonts.dirty;

  const handleSave = () => {
    colors.save();
    fonts.save();
  };

  const handleSaveAndClose = () => {
    colors.save();
    fonts.save();
    onClose?.();
  };

  return (
    <div className="wb-theme-panel">
      <ThemeSection title="Стиль">
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
      </ThemeSection>

      <ThemeSection title="Шрифт">
        <FontPicker value={fonts.draft} onChange={fonts.setFont} />
      </ThemeSection>

      <ThemeSection title="Кольори теми">
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
      </ThemeSection>

      <ThemeSection title="Готові палітри">
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
      </ThemeSection>

      {colors.missing.length > 0 && (
        <p className="wb-theme-hint wb-theme-hint--warn">
          Порожні кольори: {colors.missing.join(", ")}. Без них зберегти не вийде.
        </p>
      )}
      {colors.warning && <p className="wb-theme-hint wb-theme-hint--warn">{colors.warning}</p>}

      {/* Що саме станеться з натиснутою кнопкою — рядком, а не кольором кнопки:
          «Збережено» тут означає, що вибір уже в пам'яті пристрою. */}
      {colors.complete && (
        <p className={`wb-theme-status${dirty ? "" : " wb-theme-status--saved"}`}>
          <Icon name={dirty ? "edit" : "check"} size={16} />
          {dirty ? "Незбережені зміни" : "Збережено на цьому пристрої"}
        </p>
      )}

      <div className="wb-sheet-actions wb-theme-actions">
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
          className="wb-btn wb-btn-secondary wb-btn-sm"
          onClick={handleSave}
          disabled={!colors.complete || !dirty}
        >
          <Icon name="save" size={16} />
          Зберегти
        </button>
        {onClose && (
          <button
            type="button"
            className="wb-btn wb-btn-primary wb-btn-sm"
            onClick={handleSaveAndClose}
            disabled={!colors.complete}
          >
            <Icon name="check" size={16} />
            Зберегти і закрити
          </button>
        )}
      </div>
    </div>
  );
}
