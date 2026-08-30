/**
 * Block: Список
 *
 * Нумерований або маркірований список елементів.
 * Кожен елемент може мати іконку та опис.
 *
 * @module packages/ui/src/blocks/ListBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

interface ListItem {
  text: string;
  icon?: string;
  description?: string;
}

interface ListBlockProps {
  items: ListItem[];
  ordered?: boolean;
}

export function ListBlock({ block, children }: BlockComponentProps) {
  const { items = [], ordered = false } =
    block.props as unknown as ListBlockProps;

  if (items.length === 0) {
    return (
      <div className="py-2 text-sm text-muted-foreground italic">
        [Список порожній]
        {children}
      </div>
    );
  }

  const Tag = ordered ? 'ol' : 'ul';
  const listStyle = ordered ? 'list-decimal' : 'list-disc';

  return (
    <Tag className={`py-2 pl-5 space-y-1 ${listStyle}`}>
      {items.map((item, index) => (
        <li key={index} className="text-sm leading-relaxed">
          <div className="flex items-start gap-2">
            {item.icon && (
              <span className="mt-0.5 text-base" aria-hidden="true">
                {item.icon}
              </span>
            )}
            <div>
              <span>{item.text}</span>
              {item.description ? (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.description}
                </p>
              ) : null}
            </div>
          </div>
        </li>
      ))}
      {children}
    </Tag>
  );
}
