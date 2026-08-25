import type { CSSProperties } from "react";
import type { InternalTableBlock } from "./TableEditor";
import { RichPreview } from "../../richtext/RichPreview";

interface Props {
  block: InternalTableBlock;
}

export function TablePreview({ block }: Props) {
  if (block.rows.length === 0) {
    return <div className="tg-unknown">[Порожня таблиця]</div>;
  }
  return (
    <table
      className={`tg-table${block.isBordered ? " tg-table--bordered" : ""}${block.isStriped ? " tg-table--striped" : ""}`}
    >
      <tbody>
        {block.rows.map((row, r) => (
          <tr key={r}>
            {row.map((cell, c) => {
              const style: CSSProperties = {
                textAlign: (cell.align as CSSProperties["textAlign"]) || "left",
                verticalAlign: (cell.valign as CSSProperties["verticalAlign"]) || "middle",
              };
              return cell.isHeader ? (
                <th key={c} style={style}><RichPreview value={cell.text} /></th>
              ) : (
                <td key={c} style={style}><RichPreview value={cell.text} /></td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}