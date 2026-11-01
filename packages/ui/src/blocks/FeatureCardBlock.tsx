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

export function FeatureCardBlock({ block }: BlockComponentProps) {
  const { items = [] } = block.props as { items?: FeatureItem[] };

  if (items.length === 0) return null;

  return (
    <div className="wb-block-features">
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
