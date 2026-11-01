/**
 * Page Builder — розділювач: тонка лінія між частинами сторінки.
 *
 * Лінія одна на весь продукт: поки `style` приходив із даних, на одній сторінці
 * могли стояти три різні лінії. Тон і береги — у `styles/blocks.css`.
 *
 * @module packages/ui/src/blocks/DividerBlock
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

export function DividerBlock(_props: BlockComponentProps) {
  return <hr className="wb-block-divider" />;
}
