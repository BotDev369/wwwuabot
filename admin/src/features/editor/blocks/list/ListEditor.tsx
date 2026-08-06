import type { BaseBlock } from "../types";
import { useEditorStore } from "../../store";
import { RichTextField } from "../../richtext/RichTextField";

export type ListStyle = "bullet" | "ordered" | "checkbox";

export interface InternalListItemSimple {
  id: string;
  kind: "simple";
  text: unknown;
}
export interface InternalListItemComplex {
  id: string;
  kind: "complex";
  raw: Record<string, unknown>;
}
export type InternalListItem = InternalListItemSimple | InternalListItemComplex;

export interface InternalListBlock extends BaseBlock {
  type: "list";
  style: ListStyle;
  orderedType?: string;
  items: InternalListItem[];
}

interface Props {
  block: InternalListBlock;
  idx: number;
  total: number;
}

function newId(): string {
  return `li_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function markerFor(style: ListStyle, n: number): string {
  if (style === "ordered") return `${n + 1}.`;
  if (style === "checkbox") return "☐";
  return "•";
}

export function ListEditor({ block, idx, total }: Props) {
  const { updateBlock, removeBlock, moveBlock } = useEditorStore();
  const style: ListStyle = block.style ?? "bullet";

  function setItems(items: InternalListItem[]) {
    updateBlock(block.id, { items });
  }
  function setItemText(id: string, text: unknown) {
    setItems(block.items.map((it) => (it.id === id && it.kind === "simple" ? { ...it, text } : it)));
  }
  function removeItem(id: string) {
    setItems(block.items.filter((it) => it.id !== id));
  }
  function addItem() {
    setItems([...block.items, { id: newId(), kind: "simple", text: "" }]);
  }

  return (
    <div className="block-card">
      <div className="block-card-header">
        <span className="block-type-badge">•</span>
        <span className="block-type-label">Список</span>
        <select
          className="block-select"
          value={style}
          title="Тип списку"
          onChange={(e) => updateBlock(block.id, { style: e.target.value as ListStyle })}
        >
          <option value="bullet">Маркований</option>
          <option value="ordered">Нумерований</option>
          <option value="checkbox">Чекбокси</option>
        </select>
        <div className="block-actions">
          <button className="block-action-btn" onClick={() => moveBlock(block.id, "up")} disabled={idx === 0} title="Вгору">↑</button>
          <button className="block-action-btn" onClick={() => moveBlock(block.id, "down")} disabled={idx === total - 1} title="Вниз">↓</button>
          <button className="block-action-btn block-action-btn--danger" onClick={() => removeBlock(block.id)} title="Видалити">✕</button>
        </div>
      </div>
      <div className="block-card-body">
        <div className="bq-children">
          {block.items.map((item, n) =>
            item.kind === "simple" ? (
              <div className="bq-child" key={item.id}>
                <span className="list-num">{markerFor(style, n)}</span>
                <RichTextField
                  value={item.text}
                  onChange={(v) => setItemText(item.id, v)}
                  multiline={false}
                  showPreview={false}
                  placeholder="Пункт списку..."
                />
                <button type="button" className="block-action-btn block-action-btn--danger" onClick={() => removeItem(item.id)} title="Видалити пункт">✕</button>
              </div>
            ) : (
              <div className="bq-child" key={item.id}>
                <span className="list-num">{markerFor(style, n)}</span>
                <p className="unknown-hint">[Складний пункт — лише перегляд]</p>
              </div>
            )
          )}
        </div>
        <button type="button" className="kb-add-btn" onClick={addItem}>+ Пункт</button>
      </div>
    </div>
  );
}