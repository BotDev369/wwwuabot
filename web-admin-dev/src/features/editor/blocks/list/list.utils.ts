import type { InternalListBlock, InternalListItem, ListStyle } from "./ListEditor";

interface TgListItem {
  blocks?: unknown[];
  has_checkbox?: boolean;
  is_checked?: boolean;
  type?: string;
  value?: number;
  label?: string;
  [key: string]: unknown;
}
interface TgListBlock {
  type: "list";
  items?: TgListItem[];
}

const ORDERED_TYPES = ["1", "a", "A", "i", "I"];
// Маркерні поля, які редактор розуміє і якими керує через "тип списку".
// Все інше (is_checked, value, label тощо) → пункт стає "складним" і проходить недоторкано.
const SIMPLE_ALLOWED_EXTRA = ["has_checkbox", "type"];

function inferStyle(items: TgListItem[]): { style: ListStyle; orderedType?: string } {
  const first = items[0];
  if (!first) return { style: "bullet" };
  if (first.has_checkbox === true) return { style: "checkbox" };
  if (typeof first.type === "string" && ORDERED_TYPES.includes(first.type)) {
    return { style: "ordered", orderedType: first.type };
  }
  return { style: "bullet" };
}

export function toTelegram(block: InternalListBlock): TgListBlock {
  const style = block.style ?? "bullet";
  return {
    type: "list",
    items: block.items.map((it) => {
      if (it.kind === "complex") return it.raw as TgListItem;
      const item: TgListItem = { blocks: [{ type: "paragraph", text: it.text }] };
      if (style === "ordered") {
        item.type =
          block.orderedType && ORDERED_TYPES.includes(block.orderedType) ? block.orderedType : "1";
      }
      if (style === "checkbox") item.has_checkbox = true;
      return item;
    }),
  };
}

export function fromTelegram(tgBlock: TgListBlock, index: number): InternalListBlock {
  const tgItems = Array.isArray(tgBlock.items) ? tgBlock.items : [];
  const { style, orderedType } = inferStyle(tgItems);
  const items: InternalListItem[] = tgItems.map((item, i) => {
    const extraKeys = Object.keys(item).filter((k) => k !== "blocks");
    const blocks = Array.isArray(item.blocks) ? item.blocks : [];
    const firstBlock = blocks[0];
    const isParagraphBlock =
      typeof firstBlock === "object" &&
      firstBlock !== null &&
      (firstBlock as { type?: unknown }).type === "paragraph";
    const simpleOk =
      blocks.length === 1 &&
      isParagraphBlock &&
      extraKeys.every((k) => SIMPLE_ALLOWED_EXTRA.includes(k));
    const id = `li_${Date.now()}_${index}_${i}`;
    return simpleOk
      ? { id, kind: "simple", text: (firstBlock as { text?: unknown }).text }
      : { id, kind: "complex", raw: item };
  });
  return {
    id: `block_${Date.now()}_${index}`,
    type: "list",
    style,
    orderedType,
    items,
  };
}
