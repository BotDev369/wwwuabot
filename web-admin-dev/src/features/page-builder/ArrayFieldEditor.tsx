/**
 * ArrayFieldEditor — візуальний редактор списків об'єктів для JSON Schema.
 *
 * Підтримує form mode (кожен елемент — рядок полів) та JSON mode (textarea).
 *
 * Вигляд — класи `pb-array*`: рядок елемента, поле, вибір і кнопка режиму
 * мають ту саму мірку, що й решта конструктора.
 */

import { useState } from "react";
import { icons } from "@wwwuabot/shared";

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
      <div key={fieldKey} className="pb-array">
        <div className="pb-array__head">
          <label className="pb-array__label">{title}</label>
          {isObjectItems && (
            <button type="button" onClick={() => setMode("form")} className="pb-array__mode">
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
          className="pb-array__json"
        />
      </div>
    );
  }

  const subProperties = itemSchema.properties as Record<string, Record<string, unknown>>;

  return (
    <div key={fieldKey} className="pb-array pb-array--form">
      <div className="pb-array__head">
        <label className="pb-array__label">
          {title} ({itemsArray.length})
        </label>
        <button
          type="button"
          onClick={() => setMode("json")}
          className="pb-array__mode pb-array__mode--ghost"
          title="Редагувати як JSON"
        >
          JSON
        </button>
      </div>

      <div className="pb-array__items">
        {itemsArray.map((item, index) => {
          const itemObj = (typeof item === "object" && item !== null ? item : {}) as Record<
            string,
            unknown
          >;
          return (
            <div key={index} className="pb-array__item">
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
                      className="pb-array__select"
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
                    className={`pb-array__input${propName === "url" ? " pb-array__input--wide" : ""}`}
                  />
                );
              })}
              <button
                type="button"
                onClick={() => handleDeleteItem(index)}
                className="pb-array__remove"
                title="Видалити пункт"
              >
                {icons["close"]}
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={handleAddItem}
          className="wb-btn wb-btn-secondary pb-array__add"
        >
          + Додати пункт
        </button>
      </div>
    </div>
  );
}
