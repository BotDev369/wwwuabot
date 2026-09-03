import type { BaseBlock } from "../types";
import { useEditorStore } from "../../store";
import { PhotoPicker, type PhotoConfig } from "../media/PhotoPicker";

export interface InternalPhotoBlock extends BaseBlock {
  type: "photo";
  media: string;
  config: PhotoConfig | null;
  caption?: unknown;
  hasSpoiler?: boolean;
}

interface Props {
  block: InternalPhotoBlock;
  idx: number;
  total: number;
}

export function PhotoEditor({ block, idx, total }: Props) {
  const { updateBlock, removeBlock, moveBlock } = useEditorStore();
  return (
    <div className="wb-card">
      <div className="wb-card-header">
        <span className="block-type-badge">🖼</span>
        <span className="block-type-label">Фото</span>
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
      <div className="wb-card-body">
        <PhotoPicker
          media={block.media}
          config={block.config ?? null}
          onChange={(n) => updateBlock(block.id, { media: n.media, config: n.config })}
        />
      </div>
    </div>
  );
}
