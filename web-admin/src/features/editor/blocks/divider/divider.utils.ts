import type { InternalDividerBlock } from "./DividerEditor";

interface TgDividerBlock {
  type: "divider";
}

export function toTelegram(_block: InternalDividerBlock): TgDividerBlock {
  return {
    type: "divider",
  };
}

export function fromTelegram(_tgBlock: TgDividerBlock, index: number): InternalDividerBlock {
  return {
    id: `block_${Date.now()}_${index}`,
    type: "divider",
  };
}
