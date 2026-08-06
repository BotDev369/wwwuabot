import type { InternalBlockquoteBlock } from "./BlockquoteEditor";
import { RichBlocksView } from "../RichBlocksView";

export function BlockquotePreview({ block }: { block: InternalBlockquoteBlock }) {
  return (
    <blockquote className="tg-blockquote">
      <RichBlocksView blocks={block.children} />
    </blockquote>
  );
}