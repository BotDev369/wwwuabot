/**
 * Page Builder — Pricing Block.
 *
 * Displays one or more pricing plan cards with features list and CTA buttons.
 *
 * @module packages/ui/src/blocks/PricingBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

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
  const { plans = [], columns = 'auto' } = block.props as {
    plans?: PricingPlan[];
    columns?: string;
  };

  if (plans.length === 0) return null;

  const gridCols = columns === 'auto'
    ? `repeat(${Math.min(plans.length, 3)}, 1fr)`
    : `repeat(${columns}, 1fr)`;

  return (
    <div
      className="wb-block-pricing"
      style={{
        display: 'grid',
        gridTemplateColumns: gridCols,
        gap: 'var(--sp-4)',
      }}
    >
      {plans.map((plan, i) => (
        <div
          key={i}
          className="wb-block-pricing__card"
          style={{
            padding: 'var(--sp-5)',
            background: plan.highlighted ? 'var(--accent-dim)' : 'var(--bg-1)',
            border: plan.highlighted
              ? '2px solid var(--accent)'
              : '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-3)',
            position: 'relative',
          }}
        >
          {plan.highlighted && (
            <span
              className="wb-badge wb-badge-accent"
              style={{ position: 'absolute', top: 'var(--sp-3)', right: 'var(--sp-3)' }}
            >
              Popular
            </span>
          )}

          <div>
            <h3 className="wb-font-semibold" style={{ margin: 0, fontSize: 'var(--text-lg)' }}>
              {plan.name}
            </h3>
            <div style={{ marginTop: 'var(--sp-2)', display: 'flex', alignItems: 'baseline', gap: 'var(--sp-1)' }}>
              <span
                style={{
                  fontSize: 'var(--text-3)',
                  fontWeight: 'var(--weight-bold)',
                  fontFamily: 'var(--font-display)',
                  color: 'var(--text-primary)',
                }}
              >
                {plan.price}
              </span>
              {plan.period && (
                <span className="wb-text-sm wb-text-secondary">{plan.period}</span>
              )}
            </div>
          </div>

          {plan.features && plan.features.length > 0 && (
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--sp-2)',
                flex: 1,
              }}
            >
              {plan.features.map((f, fi) => (
                <li
                  key={fi}
                  className="wb-text-sm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--sp-2)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <span style={{ color: 'var(--green)' }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            className={plan.highlighted ? 'wb-btn wb-btn-primary' : 'wb-btn wb-btn-secondary'}
            style={{ width: '100%', marginTop: 'var(--sp-2)' }}
          >
            {plan.ctaText ?? 'Обрати'}
          </button>
        </div>
      ))}
    </div>
  );
}
