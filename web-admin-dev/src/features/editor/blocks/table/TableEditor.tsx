import type { BaseBlock } from "../types";
import { useEditorStore } from "../../store";
import { icons } from "@wwwuabot/shared";
import { RichTextField } from "../../richtext/RichTextField";

export interface InternalTableCell {
  text: unknown;
  isHeader: boolean;
  align: string;
  valign: string;
}

export interface InternalTableBlock extends BaseBlock {
  type: "table";
  rows: InternalTableCell[][];
  isBordered: boolean;
  isStriped: boolean;
}

interface Props {
  block: InternalTableBlock;
  idx: number;
  total: number;
}

function emptyCell(): InternalTableCell {
  return { text: "", isHeader: false, align: "left", valign: "middle" };
}

export function TableEditor({ block, idx, total }: Props) {
  const { updateBlock, removeBlock, moveBlock } = useEditorStore();
  const colCount = block.rows[0]?.length ?? 0;

  function setRows(rows: InternalTableCell[][]) {
    updateBlock(block.id, { rows });
  }
  function setCell(r: number, c: number, patch: Partial<InternalTableCell>) {
    setRows(
      block.rows.map((row, ri) =>
        ri !== r ? row : row.map((cell, ci) => (ci !== c ? cell : { ...cell, ...patch })),
      ),
    );
  }
  function addRow() {
    const cols = colCount || 1;
    setRows([...block.rows, Array.from({ length: cols }, emptyCell)]);
  }
  function removeRow(r: number) {
    setRows(block.rows.filter((_, ri) => ri !== r));
  }
  function addColumn() {
    setRows(block.rows.map((row) => [...row, emptyCell()]));
  }
  function removeColumn() {
    if (colCount <= 1) return;
    setRows(block.rows.map((row) => row.slice(0, -1)));
  }

  return (
    <div className="wb-card">
      <div className="wb-card-header">
        <span className="block-type-badge">T</span>
        <span className="block-type-label">Таблиця</span>
        <div className="block-actions">
          <button
            className="block-action-btn"
            onClick={() => moveBlock(block.id, "up")}
            disabled={idx === 0}
            title="Вгору"
          >
            ↑
          </button>
          <button
            className="block-action-btn"
            onClick={() => moveBlock(block.id, "down")}
            disabled={idx === total - 1}
            title="Вниз"
          >
            ↓
          </button>
          <button
            className="block-action-btn block-action-btn--danger"
            onClick={() => removeBlock(block.id)}
            title="Видалити"
          >
            {icons["close"]}
          </button>
        </div>
      </div>
      <div className="wb-card-body">
        <div className="table-options">
          <label className="table-option">
            <input
              type="checkbox"
              checked={block.isBordered}
              onChange={(e) => updateBlock(block.id, { isBordered: e.target.checked })}
            />
            З рамкою
          </label>
          <label className="table-option">
            <input
              type="checkbox"
              checked={block.isStriped}
              onChange={(e) => updateBlock(block.id, { isStriped: e.target.checked })}
            />
            Смугаста
          </label>
        </div>
        <div className="table-grid">
          {block.rows.map((row, r) => (
            <div className="table-grid-row" key={r}>
              {row.map((cell, c) => (
                <div className="table-cell" key={c}>
                  <RichTextField
                    value={cell.text}
                    onChange={(v) => setCell(r, c, { text: v })}
                    multiline={false}
                    showPreview={false}
                    placeholder={`[${r + 1}:${c + 1}]`}
                  />
                  <button
                    type="button"
                    className={`table-h-btn${cell.isHeader ? " table-h-btn--active" : ""}`}
                    title="Заголовок"
                    onClick={() => setCell(r, c, { isHeader: !cell.isHeader })}
                  >
                    H
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="block-action-btn block-action-btn--danger"
                onClick={() => removeRow(r)}
                title="Видалити рядок"
              >
              {icons["close"]}
            </button>
            </div>
          ))}
        </div>
        <div className="table-toolbar">
          <button type="button" className="kb-add-btn" onClick={addRow}>
            + Рядок
          </button>
          <button type="button" className="kb-add-btn" onClick={addColumn}>
            + Колонка
          </button>
          <button
            type="button"
            className="kb-add-btn"
            onClick={removeColumn}
            disabled={colCount <= 1}
          >
            − Колонка
          </button>
        </div>
      </div>
    </div>
  );
}
