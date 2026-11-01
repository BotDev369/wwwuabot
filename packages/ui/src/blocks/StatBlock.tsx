/**
 * Page Builder — Stat Block.
 *
 * Displays a metric card with value, label, optional icon, and trend.
 *
 * @module packages/ui/src/blocks/StatBlock
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

const TREND_ARROWS: Record<string, string> = {
  up: "↑",
  down: "↓",
  neutral: "—",
};

/** Тон тренду — зміст («більше», «менше», «без змін»), а не колір: пару
 * «тон → токен» тримає `blocks.css`. */
function trendClass(trend: string): string {
  return trend === "up" || trend === "down" ? ` wb-block-stat__trend--${trend}` : "";
}

export function StatBlock({ block }: BlockComponentProps) {
  const {
    value = "0",
    label = "",
    description = "",
    icon = "",
    trend = "neutral",
    trendValue = "",
  } = block.props as {
    value?: string;
    label?: string;
    description?: string;
    icon?: string;
    trend?: string;
    trendValue?: string;
  };

  return (
    <div className="wb-block-stat">
      <div className="wb-block-stat__head">
        <span className="wb-block-stat__label wb-text-xs">{label}</span>
        {icon && <span className="wb-block-stat__icon">{icon}</span>}
      </div>

      <div className="wb-block-stat__row">
        <span className="wb-block-stat__value">{value}</span>

        {trendValue && (
          <span className={`wb-block-stat__trend wb-text-xs${trendClass(trend)}`}>
            {TREND_ARROWS[trend] ?? ""} {trendValue}
          </span>
        )}
      </div>

      {description && <span className="wb-block-stat__desc wb-text-xs">{description}</span>}
    </div>
  );
}
