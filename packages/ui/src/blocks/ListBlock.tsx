/**
 * Page Builder — List Block.
 *
 * Displays an ordered or unordered list of items with optional icons and descriptions.
 *
 * @module packages/ui/src/blocks/ListBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

interface ListItem {
  text: string;
  icon?: string;
  description?: string;
}

export function ListBlock({ block }: BlockComponentProps) {
  const { items = [], ordered = false } = block.props as {
    items?: ListItem[];
    ordered?: boolean;
  };

  if (!items || items.length === 0) return null;

  const Tag = ordered ? 'ol' : 'ul';

  return (
    <Tag
      className="wb-block-list"
      style={{
        listStyle: ordered ? 'decimal' : 'disc',
        paddingLeft: 'var(--sp-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-2)',
      }}
    >
      {items.map((item, i) => (
        <li key={i} className="wb-block-list__item">
          <span className="wb-block-list__text wb-text-primary">{item.text}</span>
          {item.description && (
            <span className="wb-block-list__desc wb-text-sm wb-text-secondary">
              {' — '}{item.description}
            </span>
          )}
        </li>
      ))}
    </Tag>
  );
}
