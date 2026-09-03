/**
 * Page Builder — Buttons Block.
 *
 * Displays a group of action buttons (links or actions) with configurable layout.
 *
 * @module packages/ui/src/blocks/ButtonsBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

interface ButtonItem {
  text: string;
  url?: string;
  action?: string;
  variant?: string;
  icon?: string;
}

const VARIANT_CLASS: Record<string, string> = {
  primary: 'wb-btn wb-btn-primary',
  secondary: 'wb-btn wb-btn-secondary',
  outline: 'wb-btn',
  ghost: 'wb-btn wb-btn-ghost',
};

export function ButtonsBlock({ block }: BlockComponentProps) {
  const { items = [], layout = 'row' } = block.props as {
    items?: ButtonItem[];
    layout?: string;
  };

  if (!items || items.length === 0) return null;

  return (
    <div
      className="wb-block-buttons"
      style={{
        display: 'flex',
        flexDirection: layout === 'column' ? 'column' : 'row',
        flexWrap: layout === 'row' ? 'wrap' : undefined,
        gap: 'var(--sp-2)',
        justifyContent: layout === 'grid' ? 'center' : undefined,
      }}
    >
      {items.map((btn, i) => {
        const className = VARIANT_CLASS[btn.variant ?? 'primary'] ?? 'wb-btn wb-btn-primary';
        const style = layout === 'grid'
          ? { flex: '1 1 0', justifyContent: 'center' }
          : {};

        if (btn.url) {
          return (
            <a
              key={i}
              href={btn.url}
              className={className}
              style={style}
              target="_blank"
              rel="noopener noreferrer"
            >
              {btn.text}
            </a>
          );
        }

        return (
          <button
            key={i}
            type="button"
            className={className}
            style={style}
            data-action={btn.action}
          >
            {btn.text}
          </button>
        );
      })}
    </div>
  );
}
