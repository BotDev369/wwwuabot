/**
 * EmptyPageState — фокусований empty state для порожньої сторінки.
 *
 * Показується, коли жодна зона не має блоків.
 * Пропонує дві дії: «Додати зону» та «Додати блок».
 */

import { icons, type IconName } from "@wwwuabot/shared";

// ── Icon helper ───────────────────────────────────────────────────

const ico = (name: IconName, size = 16) => (
  <span style={{ display: "inline-flex", alignItems: "center", width: size, height: size, flexShrink: 0 }}>
    {icons[name]}
  </span>
);

// ── Props ─────────────────────────────────────────────────────────

interface EmptyPageStateProps {
  onAddZone: () => void;
  onAddBlock: () => void;
}

// ── Component ─────────────────────────────────────────────────────

export function EmptyPageState({ onAddZone, onAddBlock }: EmptyPageStateProps) {
  return (
    <div
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "32px 16px", textAlign: "center",
      }}
    >
      <div
        style={{
          width: 56, height: 56, borderRadius: 14,
          background: "var(--bg-secondary, #f1f5f9)",
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
        }}
      >
        {ico("construction", 32)}
      </div>
      <h3
        style={{
          margin: 0, fontSize: 16, fontWeight: 600,
          color: "var(--text-primary)", marginBottom: 6,
        }}
      >
        Сторінка порожня
      </h3>
      <p
        style={{
          margin: 0, fontSize: 13, color: "var(--text-secondary)",
          marginBottom: 20, maxWidth: 320,
        }}
      >
        Додайте зону або блок, щоб почати конструювання сторінки
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          className="wb-btn wb-btn-secondary"
          onClick={onAddZone}
          style={{ fontSize: 13, padding: "10px 18px", display: "flex", alignItems: "center", gap: 8 }}
        >
          {ico("layout", 18)} Додати зону
        </button>
        <button
          className="wb-btn wb-btn-primary"
          onClick={onAddBlock}
          style={{ fontSize: 13, padding: "10px 18px", display: "flex", alignItems: "center", gap: 8 }}
        >
          {ico("blocks", 18)} Додати блок
        </button>
      </div>
    </div>
  );
}
