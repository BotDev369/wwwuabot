import type { InternalHeadingBlock } from "./HeadingEditor";
import { RichPreview } from "../../richtext/RichPreview";

export function HeadingPreview({ block }: { block: InternalHeadingBlock }) {
  const Tag = block.level;
  return (
    <Tag className={`tg-heading tg-heading--${Tag}`}>
      <RichPreview value={block.text} />
    </Tag>
  );
}
