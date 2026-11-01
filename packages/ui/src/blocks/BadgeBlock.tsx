/**
 * Page Builder — Badge Block.
 *
 * Displays a row of status/label badges (tags).
 *
 * @module packages/ui/src/blocks/BadgeBlock
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

interface BadgeItem {
  text: string;
  /** Тон — зміст статусу (успіх / помилка), не вибір кольору: пару «тон →
   * токен» тримає `blocks.css`. */
  variant?: string;
}

const TONES = ["accent", "green", "red", "yellow", "neutral"];

export function BadgeBlock({ block }: BlockComponentProps) {
  const { items = [] } = block.props as { items?: BadgeItem[] };

  if (!items || items.length === 0) return null;

  return (
    <div className="wb-block-badges">
      {items.map((item, i) => {
        const tone = item.variant && TONES.includes(item.variant) ? item.variant : "accent";
        return (
          <span key={i} className={`wb-badge wb-badge-${tone}`}>
            {item.text}
          </span>
        );
      })}
    </div>
  );
}
