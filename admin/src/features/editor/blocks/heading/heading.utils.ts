import type { InternalHeadingBlock } from "./HeadingEditor";

interface TgHeadingBlock {
  type: "heading";
  size: number;
  text: unknown;
}

export function toTelegram(block: InternalHeadingBlock): TgHeadingBlock {
  const size = parseInt(block.level.replace("h", ""), 10);
  return { type: "heading", size, text: block.text };
}

export function fromTelegram(tgBlock: TgHeadingBlock, index: number): InternalHeadingBlock {
  const size =
    typeof tgBlock.size === "number" && tgBlock.size >= 1 && tgBlock.size <= 6
      ? tgBlock.size
      : 2;
  return {
    id: `block_${Date.now()}_${index}`,
    type: "heading",
    level: `h${size}` as InternalHeadingBlock["level"],
    text: tgBlock.text,
  };
}