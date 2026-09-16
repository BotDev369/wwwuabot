/**
 * `ColorSlotRow` — рядок одного з трьох кольорів: зразок, назва, значення.
 *
 * Рядок на всю ширину й **сам відкриває** свій редактор (`aria-expanded`), а не
 * тягне за собою модалку: правило проєкту — жодного випадаючого списку, а друга
 * поверхня над першою тут просто не потрібна. Відкритий рівно один слот: три
 * відкриті повзунки на телефоні — це екран, у якому нічого не видно.
 *
 * Порожній слот малюється **пунктиром**, а не порожнім квадратом: це той самий
 * спосіб сказати «тут нічого немає», яким користується решта продукту.
 *
 * @module packages/shared/src/components/theme/ColorSlotRow
 */

import type { ReactElement } from "react";
import { Icon } from "../Icon";
import { displayColor, type ColorSlotDefinition } from "../../styles/user-colors";
import { ColorEditor } from "./ColorEditor";

interface ColorSlotRowProps {
  slot: ColorSlotDefinition;
  value: string;
  expanded: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}

export function ColorSlotRow({
  slot,
  value,
  expanded,
  onToggle,
  onChange,
}: ColorSlotRowProps): ReactElement {
  const empty = !value;

  return (
    <div className={`wb-theme-row${expanded ? " wb-theme-row--open" : ""}`}>
      <button
        type="button"
        className="wb-theme-row-head"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${slot.labelUk}: ${empty ? "порожньо" : displayColor(value)}`}
      >
        <span
          className={`wb-theme-row-swatch${empty ? " wb-theme-row-swatch--empty" : ""}`}
          style={empty ? undefined : { background: value }}
          aria-hidden="true"
        />
        <span className="wb-theme-row-text">
          <span className="wb-theme-row-label">{slot.labelUk}</span>
          <span className="wb-theme-row-hint">{empty ? slot.hintUk : displayColor(value)}</span>
        </span>
        <span className="wb-theme-row-caret">
          <Icon name={expanded ? "chevron-up" : "chevron-down"} size={18} />
        </span>
      </button>

      {expanded && <ColorEditor value={value} onChange={onChange} />}
    </div>
  );
}
