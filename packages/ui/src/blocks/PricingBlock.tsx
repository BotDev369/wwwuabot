/**
 * Page Builder — Pricing Block.
 *
 * Displays one or more pricing plan cards with features list and CTA buttons.
 *
 * @module packages/ui/src/blocks/PricingBlock
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

interface PricingPlan {
  name: string;
  price: string;
  period?: string;
  features?: string[];
  highlighted?: boolean;
  ctaText?: string;
  ctaUrl?: string;
}

export function PricingBlock({ block }: BlockComponentProps) {
  const { plans = [] } = block.props as { plans?: PricingPlan[] };

  if (plans.length === 0) return null;

  return (
    <div className="wb-block-pricing">
      {plans.map((plan, i) => (
        <div
          key={i}
          className={`wb-block-pricing__card${plan.highlighted ? " wb-block-pricing__card--on" : ""}`}
        >
          {plan.highlighted && (
            <span className="wb-badge wb-badge-accent wb-block-pricing__badge">Popular</span>
          )}

          <div>
            <h3 className="wb-block-pricing__name">{plan.name}</h3>
            <div className="wb-block-pricing__price-row">
              <span className="wb-block-pricing__price">{plan.price}</span>
              {plan.period && (
                <span className="wb-block-pricing__period wb-text-sm wb-text-secondary">
                  {plan.period}
                </span>
              )}
            </div>
          </div>

          {plan.features && plan.features.length > 0 && (
            <ul className="wb-block-pricing__list">
              {plan.features.map((f, fi) => (
                <li key={fi} className="wb-block-pricing__feature">
                  <span className="wb-block-pricing__check" aria-hidden="true">
                    ✓
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            className={`wb-block-pricing__cta ${plan.highlighted ? "wb-btn wb-btn-primary" : "wb-btn wb-btn-secondary"}`}
          >
            {plan.ctaText ?? "Обрати"}
          </button>
        </div>
      ))}
    </div>
  );
}
