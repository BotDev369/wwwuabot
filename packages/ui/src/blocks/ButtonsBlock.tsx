/**
 * Block: Кнопки
 *
 * Група кнопок (посилання або дії).
 * Підтримує різні стилі та розташування.
 *
 * @module packages/ui/src/blocks/ButtonsBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

interface ButtonItem {
  text: string;
  url?: string;
  action?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
}

interface ButtonsBlockProps {
  items: ButtonItem[];
  layout?: 'row' | 'column' | 'grid';
}

const variantClasses: Record<string, string> = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium text-sm transition-colors',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-md font-medium text-sm transition-colors',
  outline:
    'border border-input bg-background hover:bg-accent hover:text-accent-foreground px-4 py-2 rounded-md font-medium text-sm transition-colors',
  ghost:
    'hover:bg-accent hover:text-accent-foreground px-4 py-2 rounded-md font-medium text-sm transition-colors',
};

const layoutClasses: Record<string, string> = {
  row: 'flex flex-wrap gap-2',
  column: 'flex flex-col gap-2',
  grid: 'grid grid-cols-2 gap-2',
};

export function ButtonsBlock({ block, children }: BlockComponentProps) {
  const { items = [], layout = 'row' } =
    block.props as unknown as ButtonsBlockProps;

  if (items.length === 0) {
    return (
      <div className="py-2 text-sm text-muted-foreground italic">
        [Кнопки не додано]
        {children}
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className={layoutClasses[layout] ?? layoutClasses.row}>
        {items.map((item, index) => {
          const classes = variantClasses[item.variant ?? 'primary'];

          if (item.url) {
            return (
              <a
                key={index}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={classes}
              >
                {item.text}
              </a>
            );
          }

          return (
            <button
              key={index}
              type="button"
              className={classes}
              data-action={item.action}
            >
              {item.text}
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
}
