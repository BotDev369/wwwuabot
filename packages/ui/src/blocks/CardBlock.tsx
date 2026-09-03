/**
 * Page Builder — Card Block.
 *
 * Styled container with title, description, optional border and elevation.
 * Renders children blocks inside the card body.
 *
 * @module packages/ui/src/blocks/CardBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

export function CardBlock({ block, children }: BlockComponentProps) {
  const {
    title = '',
    description = '',
    padding = 'md',
    bordered = true,
    elevated = false,
  } = block.props as {
    title?: string;
    description?: string;
    padding?: string;
    bordered?: boolean;
    elevated?: boolean;
  };

  const paddingMap: Record<string, string> = {
    sm: 'var(--sp-3)',
    md: 'var(--sp-5)',
    lg: 'var(--sp-8)',
  };

  return (
    <div
      className="wb-block-card"
      style={{
        background: 'var(--bg-1)',
        border: bordered ? '1px solid var(--border-subtle)' : 'none',
        borderRadius: 'var(--radius-lg)',
        padding: paddingMap[padding] ?? paddingMap.md,
        boxShadow: elevated ? 'var(--shadow-md)' : undefined,
      }}
    >
      {(title || description) && (
        <div className="wb-block-card__header" style={{ marginBottom: 'var(--sp-3)' }}>
          {title && (
            <h3 className="wb-block-card__title wb-font-semibold" style={{ margin: 0 }}>
              {title}
            </h3>
          )}
          {description && (
            <p className="wb-block-card__desc wb-text-sm wb-text-secondary" style={{ margin: 'var(--sp-1) 0 0 0' }}>
              {description}
            </p>
          )}
        </div>
      )}
      <div className="wb-block-card__body">
        {children}
      </div>
    </div>
  );
}
