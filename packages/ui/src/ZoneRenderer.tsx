/**
 * Page Builder — рендерер зони з декларативним контролем доступу.
 *
 * Рендерить відсортований список блоків у межах однієї зони.
 * Підтримує рекурсивну вкладеність блоків та декларативний захист PermissionGate.
 *
 * @module packages/ui/src/ZoneRenderer
 */

import type { BlockZone, PageBlock, BlockContext } from "@wwwuabot/shared/types/page-config";
import { getBlockComponent } from "./registry";
import { evaluateConditions } from "@wwwuabot/shared/utils/condition-evaluator";
import { PermissionGate } from "./PermissionGate";

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
 * Рендерер зони — відсортований список блоків з рекурсією та контролем доступу.
 */
export function ZoneRenderer({ blocks, zone, context, className }: ZoneRendererProps) {
  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  if (sorted.length === 0) return null;

  return (
    <div className={className} data-zone={zone}>
      {sorted.map((block) => {
        // 1. Перевірка базових умов (conditional rendering)
        const conditionsMatch = evaluateConditions(block.conditions, context.user);

        if (!conditionsMatch) {
          const fallback = block.conditions?.fallback;
          if (fallback) {
            const FallbackComponent = getBlockComponent(fallback.type);
            if (FallbackComponent) {
              return (
                <FallbackComponent
                  key={block.id}
                  block={fallback as PageBlock}
                  context={context}
                  zone={zone}
                />
              );
            }
          }
          return null;
        }

        const Component = getBlockComponent(block.type);
        if (!Component) return null;

        const childContent =
          block.children && block.children.length > 0 ? (
            <ZoneRenderer blocks={block.children} zone={zone} context={context} />
          ) : null;

        const props = (block.props ?? {}) as Record<string, unknown>;
        const adminOnly = Boolean(block.adminOnly || props.adminOnly);
        const ownerOnly = Boolean(block.ownerOnly || props.ownerOnly);
        const requiredCapability = (block.requiredCapability || props.requiredCapability) as
          string | undefined;

        return (
          <PermissionGate
            key={block.id}
            user={context.user}
            adminOnly={adminOnly}
            ownerOnly={ownerOnly}
            isOwner={Boolean(context.isOwner)}
            requiredCapability={requiredCapability}
          >
            <Component block={block} context={context} zone={zone}>
              {childContent}
            </Component>
          </PermissionGate>
        );
      })}
    </div>
  );
}
