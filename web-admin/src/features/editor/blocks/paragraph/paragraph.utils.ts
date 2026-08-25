import type { InternalParagraphBlock } from "./ParagraphEditor";

interface TgParagraphBlock { type: "paragraph"; text: unknown; }

export function toTelegram(block: InternalParagraphBlock): TgParagraphBlock {
  return { type: "paragraph", text: block.text };
}

export function fromTelegram(tgBlock: TgParagraphBlock, index: number): InternalParagraphBlock {
  return { id: `block_${Date.now()}_${index}`, type: "paragraph", text: tgBlock.text };
}