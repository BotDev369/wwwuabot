import type { InternalListBlock } from "./ListEditor";
import { RichPreview } from "../../richtext/RichPreview";

export function ListPreview({ block }: { block: InternalListBlock }) {
  if (block.items.length === 0) return <div className="tg-unknown">[Порожній список]</div>;
  const style = block.style ?? "bullet";

  const renderItems = () =>
    block.items.map((item) => (
      <li key={item.id}>
        {item.kind === "simple" ? <RichPreview value={item.text} /> : <span className="tg-placeholder">[складний пункт]</span>}
      </li>
    ));

  if (style === "ordered") return <ol className="tg-list tg-list--ordered">{renderItems()}</ol>;
  if (style === "checkbox") return <ul className="tg-list tg-list--check">{renderItems()}</ul>;
  return <ul className="tg-list">{renderItems()}</ul>;
}