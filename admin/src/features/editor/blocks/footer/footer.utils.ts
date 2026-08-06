import type { InternalFooterBlock } from "./FooterEditor";

interface TgFooterBlock { type: "footer"; text: unknown; }

export function toTelegram(block: InternalFooterBlock): TgFooterBlock {
  return { type: "footer", text: block.text };
}

export function fromTelegram(tgBlock: TgFooterBlock, index: number): InternalFooterBlock {
  return { id: `block_${Date.now()}_${index}`, type: "footer", text: tgBlock.text };
}