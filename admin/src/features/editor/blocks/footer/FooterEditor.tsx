import type { BaseBlock } from "../types";
import { useEditorStore } from "../../store";
import { RichTextField } from "../../richtext/RichTextField";

export interface InternalFooterBlock extends BaseBlock {
  type: "footer";
  text: unknown;
}

interface Props { block: InternalFooterBlock; idx: number; total: number; }

export function FooterEditor({ block, idx, total }: Props) {
  const { updateBlock, removeBlock, moveBlock } = useEditorStore();
  return (
    <div className="block-card">
      <div className="block-card-header">
        <span className="block-type-badge">⌞</span>
        <span className="block-type-label">Футер</span>
        <div className="block-actions">
          <button className="block-action-btn" onClick={() => moveBlock(block.id, "up")} disabled={idx === 0} title="Вгору">↑</button>
          <button className="block-action-btn" onClick={() => moveBlock(block.id, "down")} disabled={idx === total - 1} title="Вниз">↓</button>
          <button className="block-action-btn block-action-btn--danger" onClick={() => removeBlock(block.id)} title="Видалити">✕</button>
        </div>
      </div>
      <div className="block-card-body">
        <RichTextField value={block.text} onChange={(v) => updateBlock(block.id, { text: v })} multiline={false} placeholder="Текст футера..." />
      </div>
    </div>
  );
}