/**
 * Page Builder — Progress Block.
 *
 * Displays a progress bar with label, percentage, and a semantic tone.
 *
 * @module packages/ui/src/blocks/ProgressBlock
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

const TONES = ["accent", "green", "yellow", "red"];

export function ProgressBlock({ block }: BlockComponentProps) {
  const {
    value = 0,
    max = 100,
    label = "",
    showPercent = true,
    color = "accent",
  } = block.props as {
    value?: number;
    max?: number;
    label?: string;
    showPercent?: boolean;
    color?: string;
  };

  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  const tone =
    TONES.includes(color) && color !== "accent" ? ` wb-block-progress__fill--${color}` : "";

  return (
    <div className="wb-block-progress">
      {(label || showPercent) && (
        <div className="wb-block-progress__header">
          {label && <span className="wb-text-sm wb-text-primary">{label}</span>}
          {showPercent && (
            <span className="wb-text-sm wb-text-secondary">{Math.round(percent)}%</span>
          )}
        </div>
      )}

      <div className="wb-block-progress__track">
        {/* Ширина — єдине значення з даних: відсоток народжується з `value`/`max`. */}
        <div className={`wb-block-progress__fill${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
