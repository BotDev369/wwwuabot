import type { InternalTableBlock, InternalTableCell } from "./TableEditor";

interface TgTableCell {
  text?: unknown;
  is_header?: boolean;
  align?: string;
  valign?: string;
}

interface TgTableBlock {
  type: "table";
  cells: TgTableCell[][];
  is_bordered?: boolean;
  is_striped?: boolean;
}

export function toTelegram(block: InternalTableBlock): TgTableBlock {
  return {
    type: "table",
    cells: block.rows.map((row) =>
      row.map((cell) => {
        const out: TgTableCell = {
          text: cell.text,
          align: cell.align || "left",
          valign: cell.valign || "middle",
        };
        if (cell.isHeader) out.is_header = true;
        return out;
      })
    ),
    is_bordered: block.isBordered,
    is_striped: block.isStriped,
  };
}

export function fromTelegram(tgBlock: TgTableBlock, index: number): InternalTableBlock {
  const rows: InternalTableCell[][] = Array.isArray(tgBlock.cells)
    ? tgBlock.cells.map((row) =>
        Array.isArray(row)
          ? row.map((cell) => ({
              text: cell?.text ?? "",
              isHeader: cell?.is_header === true,
              align: typeof cell?.align === "string" ? cell.align : "left",
              valign: typeof cell?.valign === "string" ? cell.valign : "middle",
            }))
          : []
      )
    : [];
  return {
    id: `block_${Date.now()}_${index}`,
    type: "table",
    rows,
    isBordered: tgBlock.is_bordered === true,
    isStriped: tgBlock.is_striped === true,
  };
}