import type { BaseBlock } from "../types";
import type { InternalParagraphBlock } from "../paragraph/ParagraphEditor";
import { useEditorStore } from "../../store";
import { RichTextField } from "../../richtext/RichTextField";

export interface InternalBlockquoteBlock extends BaseBlock {
  type: "blockquote";
  children: BaseBlock[];
}

interface Props {
  block: InternalBlockquoteBlock;
  idx: number;
  total: number;
}

function newChildId(): string {
  return `child_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function BlockquoteEditor({ block, idx, total }: Props) {
  const { updateBlock, removeBlock, moveBlock } = useEditorStore();

  function setChildren(children: BaseBlock[]) {
    updateBlock(block.id, { children });
  }
  function setChildText(id: string, text: unknown) {
    setChildren(block.children.map((c) => (c.id === id ? { ...c, text } : c)));
  }
  function addChild() {
    const child: InternalParagraphBlock = { id: newChildId(), type: "paragraph", text: "" };
    setChildren([...block.children, child]);
  }
  function removeChild(id: string) {
    setChildren(block.children.filter((c) => c.id !== id));
  }

  return (
    <div className="block-card">
      <div className="block-card-header">
        <span className="block-type-badge">❝</span>
        <span className="block-type-label">Цитата</span>
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
        <div className="bq-children">
          {block.children.map((child) =>
            child.type === "paragraph" ? (
              <div className="bq-child" key={child.id}>
                <RichTextField
                  value={(child as InternalParagraphBlock).text}
                  onChange={(v) => setChildText(child.id, v)}
                  multiline
                  placeholder="Текст цитати..."
                />
                <button
                  type="button"
                  className="block-action-btn block-action-btn--danger"
                  onClick={() => removeChild(child.id)}
                  title="Видалити абзац"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="bq-child" key={child.id}>
                <p className="unknown-hint">[Вкладений блок «{child.type}» — лише перегляд]</p>
              </div>
            ),
          )}
        </div>
        <button type="button" className="kb-add-btn" onClick={addChild}>
          + Абзац
        </button>
      </div>
    </div>
  );
}
