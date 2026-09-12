/**
 * SchemaField — рекурсивний рендерер полів для props на основі JSON Schema.
 *
 * Підтримує: string, boolean, enum, array (з візуальним редактором списків об'єктів), number.
 * Якщо schema не вказана — рендерить generic text input для кожного ключа.
 */
import React from "react";
import { ArrayFieldEditor } from "./ArrayFieldEditor";

interface SchemaFieldProps {
  props: Record<string, unknown>;
  schema: Record<string, unknown> | undefined;
  onChange: (key: string, value: unknown) => void;
}

export function SchemaField({ props, schema, onChange }: SchemaFieldProps): React.ReactNode {
  if (!schema || typeof schema !== "object" || !schema.properties) {
    return Object.entries(props).map(([key, value]) => (
      <div
        key={key}
        className="pb-be-field"
        style={{ display: "flex", gap: 8, alignItems: "center" }}
      >
        <label
          className="pb-be-field-label"
          style={{ fontSize: 12, minWidth: 100, color: "var(--text-secondary)" }}
        >
          {key}
        </label>
        <input
          type="text"
          className="pb-be-field-input"
          value={typeof value === "string" ? value : JSON.stringify(value ?? "")}
          onChange={(e) => {
            const val = e.target.value;
            try {
              onChange(key, JSON.parse(val));
            } catch {
              onChange(key, val);
            }
          }}
          style={{
            flex: 1,
            fontSize: 13,
            padding: "4px 8px",
            border: "1px solid var(--border)",
            borderRadius: 4,
            background: "var(--bg-primary)",
            color: "var(--text-primary)",
          }}
        />
      </div>
    ));
  }

  const properties = schema.properties as Record<string, Record<string, unknown>>;

  return Object.entries(properties).map(([key, propSchema]) => {
    const currentValue = props[key];
    const title = (propSchema.title as string) ?? key;
    const type = propSchema.type as string;

    const fieldStyle = { fontSize: 12, minWidth: 100, color: "var(--text-secondary)" } as const;
    const inputStyle = {
      flex: 1,
      fontSize: 13,
      padding: "4px 8px",
      border: "1px solid var(--border)",
      borderRadius: 4,
      background: "var(--bg-primary)",
      color: "var(--text-primary)",
    } as const;

    if (type === "boolean") {
      return (
        <div
          key={key}
          className="pb-be-field"
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          <label className="pb-be-field-label" style={fieldStyle}>
            {title}
          </label>
          <input
            type="checkbox"
            checked={!!currentValue}
            onChange={(e) => onChange(key, e.target.checked)}
          />
        </div>
      );
    }

    if (type === "string" && Array.isArray(propSchema.enum)) {
      return (
        <div
          key={key}
          className="pb-be-field"
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          <label className="pb-be-field-label" style={fieldStyle}>
            {title}
          </label>
          <select
            className="pb-be-field-input"
            value={String(currentValue ?? propSchema.default ?? "")}
            onChange={(e) => onChange(key, e.target.value)}
            style={inputStyle}
          >
            {(propSchema.enum as string[]).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (type === "array") {
      return (
        <ArrayFieldEditor
          key={key}
          fieldKey={key}
          title={title}
          propSchema={propSchema}
          currentValue={currentValue}
          onChange={onChange}
        />
      );
    }

    if (type === "number" || type === "integer") {
      return (
        <div
          key={key}
          className="pb-be-field"
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          <label className="pb-be-field-label" style={fieldStyle}>
            {title}
          </label>
          <input
            type="number"
            className="pb-be-field-input"
            value={typeof currentValue === "number" ? currentValue : ""}
            onChange={(e) =>
              onChange(key, e.target.value === "" ? undefined : Number(e.target.value))
            }
            style={inputStyle}
          />
        </div>
      );
    }

    // Default: text input
    return (
      <div
        key={key}
        className="pb-be-field"
        style={{ display: "flex", gap: 8, alignItems: "center" }}
      >
        <label className="pb-be-field-label" style={fieldStyle}>
          {title}
        </label>
        <input
          type="text"
          className="pb-be-field-input"
          value={
            typeof currentValue === "string" ? currentValue : JSON.stringify(currentValue ?? "")
          }
          onChange={(e) => {
            const val = e.target.value;
            try {
              onChange(key, JSON.parse(val));
            } catch {
              onChange(key, val);
            }
          }}
          style={inputStyle}
        />
      </div>
    );
  });
}
