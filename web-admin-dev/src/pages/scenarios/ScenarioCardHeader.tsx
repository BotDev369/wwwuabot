import { Icon } from "@wwwuabot/shared";

/** Шапка модалки: номер рядка + адреса, посилання на живу сторінку, закриття. */
export function ScenarioCardHeader({
  slug,
  rowId,
  onClose,
}: {
  slug: string;
  rowId: unknown;
  onClose: () => void;
}) {
  const title = rowId == null ? slug : `#${rowId} ${slug}`;

  return (
    <div className="wb-modal-header">
      <span className="wb-modal-title">
        <Icon name="clipboard" /> {title}
      </span>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <a
          href={`/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="wb-btn wb-btn-secondary"
          style={{ fontSize: 12, padding: "4px 10px", textDecoration: "none" }}
        >
          <Icon name="link" /> Перейти
        </a>
        <button className="wb-close-btn" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
    </div>
  );
}
