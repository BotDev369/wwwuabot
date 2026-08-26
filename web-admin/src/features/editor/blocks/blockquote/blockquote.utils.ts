import { blockRegistry } from "../registry";
import type { InternalBlockquoteBlock } from "./BlockquoteEditor";

interface TgBlockquoteBlock {
  type: "blockquote";
  blocks?: any[];
}

export function toTelegram(block: InternalBlockquoteBlock): TgBlockquoteBlock {
  return { type: "blockquote", blocks: blockRegistry.serialize(block.children) };
}

export function fromTelegram(tgBlock: TgBlockquoteBlock, index: number): InternalBlockquoteBlock {
  return {
    id: `block_${Date.now()}_${index}`,
    type: "blockquote",
    children: blockRegistry.deserialize(Array.isArray(tgBlock.blocks) ? tgBlock.blocks : []),
  };
}
