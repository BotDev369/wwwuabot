/** Сирий JSON користувача — для діагностики у платформі, згорнутий за замовчуванням. */
export function RawJsonDetails({ value }: { value: unknown }) {
  return (
    <details style={{ marginTop: 16 }}>
      <summary style={{ cursor: "pointer", color: "var(--text-muted, #888)", fontSize: 13 }}>
        Показати сирий JSON
      </summary>
      <pre
        style={{
          background: "var(--bg-2, #1a1a2e)",
          padding: 12,
          borderRadius: 8,
          fontSize: 12,
          overflow: "auto",
          marginTop: 8,
          whiteSpace: "pre-wrap",
        }}
      >
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}
