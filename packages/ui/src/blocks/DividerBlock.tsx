/**
 * Page Builder — Divider Block.
 *
 * Horizontal hairline between parts of a page.
 *
 * @module packages/ui/src/blocks/DividerBlock
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

export function DividerBlock({ block }: BlockComponentProps) {
  const { style = "solid" } = block.props as { style?: string };

  return <hr className={`wb-block-divider wb-block-divider--${style}`} />;
}
