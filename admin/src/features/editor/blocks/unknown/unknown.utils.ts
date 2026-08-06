import type { InternalUnknownBlock } from "./UnknownEditor";

export function toTelegram(block: InternalUnknownBlock): Record<string, unknown> {
  return block.raw; // ← недоторкано
}

export function fromTelegram(
  tgBlock: Record<string, unknown>,
  index: number
): InternalUnknownBlock {
  return {
    id: `block_${Date.now()}_${index}`,
    type: "unknown",
    tgType: typeof tgBlock.type === "string" ? tgBlock.type : "unknown",
    raw: tgBlock,
  };
}