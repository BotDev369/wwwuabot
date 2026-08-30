/**
 * Page Builder — рендерер зони.
 *
 * Рендерить відсортований список блоків у межах однієї зони.
 * Підтримує рекурсивну вкладеність блоків.
 *
 * @module packages/ui/src/ZoneRenderer
 */

import type { BlockZone, PageBlock, BlockContext } from '@wwwuabot/shared/types/page-config';
import { getBlockComponent } from './registry';

interface ZoneRendererProps {
  /** Блоки для рендеру. */
  blocks: PageBlock[];

  /** Зона, в якій знаходяться блоки. */
  zone: BlockZone;

  /** Контекст сторінки. */
  context: BlockContext;

  /** CSS-клас для контейнера зони. */
  className?: string;
}

/**
 * Рендерер зони — відсортований список блоків з рекурсією.
 *
 * Кожен блок:
 * 1. Шукається в реєстрі по `type`
 * 2. Якщо знайдений — рендериться з пропсами `block`, `context`, `zone`
 * 3. Якщо блок має `children` — вони рендеряться як вкладені блоки
 * 4. Якщо тип не зареєстрований — блок пропускається (не рендериться)
 */
export function ZoneRenderer({
  blocks,
  zone,
  context,
  className,
}: ZoneRendererProps) {
  // Сортуємо за order
  const sorted = [...blocks].sort((a, b) => a.order - b.order);

  if (sorted.length === 0) return null;

  return (
    <div className={className} data-zone={zone}>
      {sorted.map((block) => {
        const Component = getBlockComponent(block.type);

        if (!Component) {
          // Блок не зареєстрований — пропускаємо
          if (import.meta.env.DEV) {
            console.warn(
              `[PageBuilder] Block type "${block.type}" is not registered. Skipping.`,
            );
          }
          return null;
        }

        // Рендеримо вкладені блоки, якщо є
        const childContent =
          block.children && block.children.length > 0 ? (
            <ZoneRenderer
              blocks={block.children}
              zone={zone}
              context={context}
            />
          ) : null;

        return (
          <Component
            key={block.id}
            block={block}
            context={context}
            zone={zone}
          >
            {childContent}
          </Component>
        );
      })}
    </div>
  );
}
