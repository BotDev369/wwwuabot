/**
 * Page Builder — Feature Card Block.
 *
 * Displays a grid of feature highlight cards, each with an icon, title, and description.
 *
 * @module packages/ui/src/blocks/FeatureCardBlock
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

interface FeatureItem {
  icon?: string;
  title: string;
  description?: string;
}

/**
 * Показник — коротке число, а не фраза: «28,8%», «+1,8 в.п.», «+347 млн».
 * Саме за цим плитки й діляться: цифри стають парою великим кеглем, а проза —
 * одним стовпцем, де абзацу вистачає ширини. Ознака тут структурна, бо
 * візуальні пропси з контенту вирізає міграція — колонки з них уже не приходять.
 */
const FIGURE = /^[+−\-≈]?[\d\s.,]+\s*(?:%|млн|млрд|в\.\s?п\.)?$/u;

function isFigure(item: FeatureItem): boolean {
  return FIGURE.test(item.title.trim());
}

export function FeatureCardBlock({ block }: BlockComponentProps) {
  const { items = [] } = block.props as { items?: FeatureItem[] };

  if (items.length === 0) return null;

  const figures = items.length > 1 && items.every(isFigure);
  const className = figures ? "wb-block-features wb-block-features--figures" : "wb-block-features";

  return (
    <div className={className}>
      {items.map((item, i) => (
        <div key={i} className="wb-block-features__card">
          {item.icon && (
            <span className="wb-block-features__icon" aria-hidden="true">
              {item.icon}
            </span>
          )}
          <h4 className="wb-block-features__title">{item.title}</h4>
          {item.description && <p className="wb-block-features__desc">{item.description}</p>}
        </div>
      ))}
    </div>
  );
}
