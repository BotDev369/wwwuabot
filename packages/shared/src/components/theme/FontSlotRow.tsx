/**
 * `FontSlotRow` — рядок «Шрифт»: зразок, назва, значення, каретка.
 *
 * Розмітка та сама, що в рядка кольору (`ColorSlotRow`) — залитий рядок на всю
 * ширину, який **сам себе розкриває**. Це не економія коду: три кольори й
 * шрифт — це один набір налаштувань («Налаштувати тему»), і якщо кольори
 * ховались під акордеон, а шрифт висів списком на пів екрана, людина бачила
 * дві різні форми для одного кроку.
 *
 * **Зразок — дві літери, набрані тим самим шрифтом.** У шрифту немає кольору,
 * у нього є форма, тож квадрат зразка тут не працював би; а назва родини
 * («Lora») нічого не каже, доки її не побачиш (`FontPicker` з тієї ж причини
 * малює підписи своїми шрифтами).
 *
 * @module packages/shared/src/components/theme/FontSlotRow
 */

import type { CSSProperties, ReactElement } from "react";
import { Icon } from "../Icon";
import { fontLabel, fontStack } from "../../styles/fonts";
import { FontPicker } from "./FontPicker";

interface FontSlotRowProps {
  /** Ідентифікатор вибраного шрифту; порожньо — «як у стилі». */
  value: string;
  expanded: boolean;
  onToggle: () => void;
  onChange: (id: string) => void;
}

export function FontSlotRow({
  value,
  expanded,
  onToggle,
  onChange,
}: FontSlotRowProps): ReactElement {
  // Значення рядка — **назва**, а не id: людина бачить «Lora», а не «lora».
  const label = fontLabel(value) ?? "Як у стилі";

  return (
    <div className={`wb-theme-row${expanded ? " wb-theme-row--open" : ""}`}>
      <button
        type="button"
        className="wb-theme-row-head"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`Шрифт: ${label}`}
      >
        <span
          className="wb-theme-row-swatch wb-theme-row-swatch--glyph"
          style={{ fontFamily: fontStack(value) ?? undefined } as CSSProperties}
          aria-hidden="true"
        >
          Аа
        </span>
        <span className="wb-theme-row-text">
          <span className="wb-theme-row-label">Шрифт</span>
          <span className="wb-theme-row-hint">{label}</span>
        </span>
        <span className="wb-theme-row-caret">
          <Icon name={expanded ? "chevron-up" : "chevron-down"} size={18} />
        </span>
      </button>

      {expanded && (
        <div className="wb-theme-row-body">
          <FontPicker value={value} onChange={onChange} />
        </div>
      )}
    </div>
  );
}
