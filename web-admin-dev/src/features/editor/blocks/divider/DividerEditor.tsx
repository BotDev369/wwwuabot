import type { BaseBlock } from "../types";
import { useEditorStore } from "../../store";
import { icons } from "@wwwuabot/shared";

export interface InternalDividerBlock extends BaseBlock {
  type: "divider";
}

interface Props {
  block: InternalDividerBlock;
  idx: number;
  total: number;
}

export function DividerEditor({ block, idx, total }: Props) {
  const { removeBlock, moveBlock } = useEditorStore();

  return (
    <div className="wb-card">
      <div className="wb-card-header">
        <span className="block-type-badge">—</span>
        <span className="block-type-label">Розділювач</span>
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
        <div className="divider-preview-line" />
      </div>
    </div>
  );
}
