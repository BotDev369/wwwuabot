/**
 * ArrayFieldEditor — візуальний редактор списків об'єктів для JSON Schema.
 *
 * Підтримує form mode (кожен елемент — рядок полів) та JSON mode (textarea).
 */

import { useState } from "react";

interface ArrayFieldEditorProps {
  fieldKey: string;
  title: string;
  propSchema: Record<string, unknown>;
  currentValue: unknown;
  onChange: (key: string, value: unknown) => void;
}

export function ArrayFieldEditor({
  fieldKey,
  title,
  propSchema,
  currentValue,
  onChange,
}: ArrayFieldEditorProps) {
  const [mode, setMode] = useState<"form" | "json">("form");

  const itemSchema = (propSchema.items as Record<string, unknown>) || {};
  const isObjectItems = Boolean(
    itemSchema.type === "object" &&
    itemSchema.properties &&
    typeof itemSchema.properties === "object",
  );

  const itemsArray = Array.isArray(currentValue) ? currentValue : [];

  const handleItemChange = (index: number, propName: string, val: unknown) => {
    const next = itemsArray.map((item, i) => {
      if (i !== index) return item;
      return { ...(typeof item === "object" && item !== null ? item : {}), [propName]: val };
    });
    onChange(fieldKey, next);
  };

  const handleAddItem = () => {
    const newItem: Record<string, unknown> = {};
    if (isObjectItems) {
      const props = itemSchema.properties as Record<string, Record<string, unknown>>;
      for (const [k, p] of Object.entries(props)) {
        if (p.default !== undefined) newItem[k] = p.default;
        else if (p.type === "string") newItem[k] = "";
        else if (p.type === "boolean") newItem[k] = false;
      }
    }
    onChange(fieldKey, [...itemsArray, newItem]);
  };

  const handleDeleteItem = (index: number) => {
    onChange(
      fieldKey,
      itemsArray.filter((_, i) => i !== index),
    );
  };

  // JSON mode or non-object items
  if (!isObjectItems || mode === "json") {
    return (
      <div
        key={fieldKey}
        style={{ display: "flex", gap: 6, flexDirection: "column", marginTop: 4 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>
            {title}
          </label>
          {isObjectItems && (
            <button
              type="button"
              onClick={() => setMode("form")}
              style={{
                fontSize: 11,
                padding: "2px 6px",
                borderRadius: 4,
                border: "1px solid var(--border)",
                background: "var(--bg-2, #f3f4f6)",
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              Форма
            </button>
          )}
        </div>
        <textarea
          value={
            typeof currentValue === "string"
              ? currentValue
              : JSON.stringify(currentValue ?? [], null, 2)
          }
          onChange={(e) => {
            try {
              onChange(fieldKey, JSON.parse(e.target.value));
            } catch {
              onChange(fieldKey, e.target.value);
            }
          }}
          rows={4}
          style={{
            fontSize: 12,
            fontFamily: "monospace",
            padding: "6px 8px",
            border: "1px solid var(--border)",
            borderRadius: 4,
            background: "var(--bg-primary, var(--bg-0))",
            color: "var(--text-primary)",
          }}
        />
      </div>
    );
  }

  const subProperties = itemSchema.properties as Record<string, Record<string, unknown>>;

  return (
    <div key={fieldKey} style={{ display: "flex", gap: 8, flexDirection: "column", marginTop: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>
          {title} ({itemsArray.length})
        </label>
        <button
          type="button"
          onClick={() => setMode("json")}
          style={{
            fontSize: 11,
            padding: "2px 6px",
            borderRadius: 4,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}
          title="Редагувати як JSON"
        >
          JSON
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {itemsArray.map((item, index) => {
          const itemObj = (typeof item === "object" && item !== null ? item : {}) as Record<
            string,
            unknown
          >;
          return (
            <div
              key={index}
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                padding: "6px 8px",
                background: "var(--bg-2, rgba(128,128,128,0.05))",
                border: "1px solid var(--border, #e5e7eb)",
                borderRadius: 6,
                flexWrap: "wrap",
              }}
            >
              {Object.entries(subProperties).map(([propName, propDef]) => {
                const pTitle = (propDef.title as string) || propName;
                const pVal = itemObj[propName] ?? "";
                const isEnum = Array.isArray(propDef.enum);

                if (isEnum) {
                  return (
                    <select
                      key={propName}
                      value={String(pVal || propDef.default || "")}
                      onChange={(e) => handleItemChange(index, propName, e.target.value)}
                      title={pTitle}
                      style={{
                        fontSize: 12,
                        padding: "4px 6px",
                        border: "1px solid var(--border)",
                        borderRadius: 4,
                        background: "var(--bg-primary, var(--bg-0))",
                        color: "var(--text-primary)",
                      }}
                    >
                      {(propDef.enum as string[]).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  );
                }

                return (
                  <input
                    key={propName}
                    type="text"
                    placeholder={pTitle}
                    title={pTitle}
                    value={String(pVal)}
                    onChange={(e) => handleItemChange(index, propName, e.target.value)}
                    style={{
                      flex: propName === "url" ? 2 : 1,
                      minWidth: 80,
                      fontSize: 12,
                      padding: "4px 6px",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      background: "var(--bg-primary, var(--bg-0))",
                      color: "var(--text-primary)",
                    }}
                  />
                );
              })}
              <button
                type="button"
                onClick={() => handleDeleteItem(index)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--danger, #ef4444)",
                  cursor: "pointer",
                  padding: "2px 6px",
                  fontSize: 14,
                  lineHeight: 1,
                }}
                title="Видалити пункт"
              >
                ✕
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={handleAddItem}
          className="wb-btn wb-btn-secondary"
          style={{ fontSize: 11, padding: "4px 10px", alignSelf: "flex-start", cursor: "pointer" }}
        >
          + Додати пункт
        </button>
      </div>
    </div>
  );
}
