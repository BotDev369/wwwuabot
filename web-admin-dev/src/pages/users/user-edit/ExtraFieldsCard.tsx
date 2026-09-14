import { Icon } from "@wwwuabot/shared";

/** Ключі, під які розгортаємо textarea: там зазвичай JSON або список. */
const HEAVY_KEY_HINTS = ["data", "json", "topics", "galyashop", "ttt"];

export function ExtraFieldsCard({
  fields,
  onChange,
}: {
  fields: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  if (Object.keys(fields).length === 0) return null;

  return (
    <div className="wb-card">
      <div className="wb-card-header">
        <span className="wb-card-title">
          <Icon name="wrench" /> Додаткові поля
        </span>
      </div>
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {Object.entries(fields).map(([key, value]) => (
          <div key={key}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 2,
                color: "var(--text-secondary)",
              }}
            >
              {key}
            </label>
            <textarea
              className="wb-textarea"
              rows={HEAVY_KEY_HINTS.some((hint) => key.includes(hint)) ? 4 : 1}
              value={value}
              onChange={(e) => onChange(key, e.target.value)}
              style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
