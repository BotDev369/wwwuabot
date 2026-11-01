/**
 * Page Builder — Card Block.
 *
 * Styled container with title and description.
 * Renders children blocks inside the card body.
 *
 * @module packages/ui/src/blocks/CardBlock
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

export function CardBlock({ block, children }: BlockComponentProps) {
  const { title = "", description = "" } = block.props as {
    title?: string;
    description?: string;
  };

  return (
    <div className="wb-block-card">
      {(title || description) && (
        <div className="wb-block-card__header">
          {title && <h3 className="wb-block-card__title">{title}</h3>}
          {description && <p className="wb-block-card__desc wb-text-sm">{description}</p>}
        </div>
      )}
      <div className="wb-block-card__body">{children}</div>
    </div>
  );
}
