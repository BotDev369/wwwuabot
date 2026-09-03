import { useState } from "react";
import type { BaseBlock } from "../types";
import { icons } from "@wwwuabot/shared";
import { blockRegistry } from "../registry";
import { useEditorStore } from "../../store";
import { RichTextField } from "../../richtext/RichTextField";

export interface InternalDetailsBlock extends BaseBlock {
  type: "details";
  summary: unknown;
  isOpen: boolean;
  children: BaseBlock[];
}

interface Props {
  block: InternalDetailsBlock;
  idx: number;
  total: number;
}

function newChildId(): string {
  return `block_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function DetailsEditor({ block, idx, total }: Props) {
  const { updateBlock, removeBlock, moveBlock } = useEditorStore();
  const [pickType, setPickType] = useState("paragraph");

  function setChildren(children: BaseBlock[]) {
    updateBlock(block.id, { children });
  }
  function addChild() {
    const config = blockRegistry.getByInternalType(pickType);
    if (!config) return;
    setChildren([...block.children, config.createDefault(newChildId())]);
  }

  return (
    <div className="wb-card">
      <div className="wb-card-header">
        <span className="block-type-badge">▸</span>
        <span className="block-type-label">Details (розгортаюча секція)</span>
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
        <RichTextField
          value={block.summary}
          onChange={(v) => updateBlock(block.id, { summary: v })}
          multiline={false}
          showPreview={false}
          placeholder="Заголовок секції (summary)..."
        />
        <label className="table-option" style={{ marginTop: 8 }}>
          <input
            type="checkbox"
            checked={block.isOpen}
            onChange={(e) => updateBlock(block.id, { isOpen: e.target.checked })}
          />
          Розгорнуто за замовчуванням
        </label>
        <div className="details-children">
          {block.children.map((child, i) => {
            const config = blockRegistry.getByInternalType(child.type);
            if (!config) return null;
            const EditorComponent = config.Editor;
            return (
              <EditorComponent
                key={child.id}
                block={child as never}
                idx={i}
                total={block.children.length}
              />
            );
          })}
        </div>
        <div className="details-add">
          <select
            className="wb-select"
            value={pickType}
            onChange={(e) => setPickType(e.target.value)}
          >
            {blockRegistry.getAllConfigs().map((c) => (
              <option key={c.type} value={c.type}>
                {c.label}
              </option>
            ))}
          </select>
          <button type="button" className="kb-add-btn" onClick={addChild}>
            + Додати
          </button>
        </div>
      </div>
    </div>
  );
}
