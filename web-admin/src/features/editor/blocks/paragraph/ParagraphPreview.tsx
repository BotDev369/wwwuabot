import type { InternalParagraphBlock } from "./ParagraphEditor";
import { RichPreview } from "../../richtext/RichPreview";

export function ParagraphPreview({ block }: { block: InternalParagraphBlock }) {
  return <p className="tg-paragraph"><RichPreview value={block.text} /></p>;
}