import { blockRegistry } from "../registry";
import type { InternalDetailsBlock } from "./DetailsEditor";

interface TgDetailsBlock {
  type: "details";
  summary?: unknown;
  blocks?: any[];
  is_open?: boolean;
}

export function toTelegram(block: InternalDetailsBlock): TgDetailsBlock {
  const out: TgDetailsBlock = {
    type: "details",
    summary: block.summary,
    blocks: blockRegistry.serialize(block.children),
  };
  if (block.isOpen) out.is_open = true;
  return out;
}

export function fromTelegram(tgBlock: TgDetailsBlock, index: number): InternalDetailsBlock {
  return {
    id: `block_${Date.now()}_${index}`,
    type: "details",
    summary: tgBlock.summary ?? "",
    isOpen: tgBlock.is_open === true,
    children: blockRegistry.deserialize(Array.isArray(tgBlock.blocks) ? tgBlock.blocks : []),
  };
}
