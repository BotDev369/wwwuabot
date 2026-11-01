/**
 * Page Builder — Spacer Block.
 *
 * Provides one canonical vertical gap. Просвіт між блоками тримає зона, тож
 * блок має рівно одну міру й не приймає власної висоти з props.
 *
 * @module packages/ui/src/blocks/SpacerBlock
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

export function SpacerBlock(_props: BlockComponentProps) {
  return <div className="wb-block-spacer" />;
}
