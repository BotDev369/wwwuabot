/**
 * Page Builder — Rating Block.
 *
 * Displays a star-based rating. Кегль зірок один на продукт: у ряду зірки
 * мусять бути одного розміру, тож `size` з props більше не діє.
 *
 * @module packages/ui/src/blocks/RatingBlock
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

export function RatingBlock({ block }: BlockComponentProps) {
  const {
    value = 0,
    max = 5,
    label = "",
  } = block.props as {
    value?: number;
    max?: number;
    label?: string;
  };

  return (
    <div className="wb-block-rating">
      {label && <span className="wb-text-sm wb-text-secondary">{label}</span>}
      <div className="wb-block-rating__stars">
        {Array.from({ length: max }, (_, i) => {
          const filled = i < Math.round(value);
          return (
            <span
              key={i}
              className={`wb-block-rating__star${filled ? " wb-block-rating__star--on" : ""}`}
              aria-hidden="true"
            >
              ★
            </span>
          );
        })}
      </div>
      <span className="wb-text-xs wb-text-muted">
        {value}/{max}
      </span>
    </div>
  );
}
