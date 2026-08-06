import type { InternalDetailsBlock } from "./DetailsEditor";
import { RichBlocksView } from "../RichBlocksView";
import { RichPreview } from "../../richtext/RichPreview";

export function DetailsPreview({ block }: { block: InternalDetailsBlock }) {
  return (
    <details className="tg-details" open={block.isOpen || undefined}>
      <summary className="tg-details-summary">
        <RichPreview value={block.summary} />
      </summary>
      <div className="tg-details-body">
        <RichBlocksView blocks={block.children} />
      </div>
    </details>
  );
}