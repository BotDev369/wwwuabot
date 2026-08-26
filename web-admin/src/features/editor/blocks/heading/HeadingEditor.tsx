import type { BaseBlock } from "../types";
import { useEditorStore } from "../../store";
import { RichTextField } from "../../richtext/RichTextField";

export type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export interface InternalHeadingBlock extends BaseBlock {
  type: "heading";
  level: HeadingLevel;
  text: unknown;
}

interface Props {
  block: InternalHeadingBlock;
  idx: number;
  total: number;
}

export function HeadingEditor({ block, idx, total }: Props) {
  const { updateBlock, removeBlock, moveBlock } = useEditorStore();
  return (
    <div className="block-card">
      <div className="block-card-header">
        <span className="block-type-badge">H</span>
        <select
          className="block-select"
          value={block.level}
          onChange={(e) => updateBlock(block.id, { level: e.target.value })}
        >
          <option value="h1">H1</option>
          <option value="h2">H2</option>
          <option value="h3">H3</option>
          <option value="h4">H4</option>
          <option value="h5">H5</option>
          <option value="h6">H6</option>
        </select>
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
            ✕
          </button>
        </div>
      </div>
      <div className="block-card-body">
        <RichTextField
          value={block.text}
          onChange={(v) => updateBlock(block.id, { text: v })}
          multiline={false}
          placeholder="Текст заголовка..."
        />
      </div>
    </div>
  );
}
