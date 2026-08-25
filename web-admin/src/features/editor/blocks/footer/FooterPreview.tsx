import type { InternalFooterBlock } from "./FooterEditor";
import { RichPreview } from "../../richtext/RichPreview";

export function FooterPreview({ block }: { block: InternalFooterBlock }) {
  return <div className="tg-footer"><RichPreview value={block.text} /></div>;
}