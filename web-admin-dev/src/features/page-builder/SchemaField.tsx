/**
 * SchemaField — рекурсивний рендерер полів для props на основі JSON Schema.
 *
 * Підтримує: string, boolean, enum, array (з візуальним редактором списків об'єктів), number.
 * Якщо schema не вказана — рендерить generic text input для кожного ключа.
 */
import React, { useState } from 'react';

interface SchemaFieldProps {
  /** Поточні значення props. */
  props: Record<string, unknown>;
  /** JSON Schema для валідації. */
  schema: Record<string, unknown> | undefined;
  /** Callback: змінити значення поля. */
  onChange: (key: string, value: unknown) => void;
}

interface ArrayFieldEditorProps {
  fieldKey: string;
  title: string;
  propSchema: Record<string, unknown>;
  currentValue: unknown;
  onChange: (key: string, value: unknown) => void;
}

function ArrayFieldEditor({
  fieldKey,
  title,
  propSchema,
  currentValue,
  onChange,
}: ArrayFieldEditorProps) {
  const [mode, setMode] = useState<'form' | 'json'>('form');

  const itemSchema = (propSchema.items as Record<string, unknown>) || {};
  const isObjectItems = Boolean(
    itemSchema.type === 'object' &&
    itemSchema.properties &&
    typeof itemSchema.properties === 'object'
  );

  const itemsArray = Array.isArray(currentValue) ? currentValue : [];

  const handleItemChange = (index: number, propName: string, val: unknown) => {
    const next = itemsArray.map((item, i) => {
      if (i !== index) return item;
      return { ...(typeof item === 'object' && item !== null ? item : {}), [propName]: val };
    });
    onChange(fieldKey, next);
  };

  const handleAddItem = () => {
    const newItem: Record<string, unknown> = {};
    if (isObjectItems) {
      const props = itemSchema.properties as Record<string, Record<string, unknown>>;
      for (const [k, p] of Object.entries(props)) {
        if (p.default !== undefined) {
          newItem[k] = p.default;
        } else if (p.type === 'string') {
          newItem[k] = '';
        } else if (p.type === 'boolean') {
          newItem[k] = false;
        }
      }
    }
    onChange(fieldKey, [...itemsArray, newItem]);
  };

  const handleDeleteItem = (index: number) => {
    const next = itemsArray.filter((_, i) => i !== index);
    onChange(fieldKey, next);
  };

  // If not object items or in json mode, show textarea
  if (!isObjectItems || mode === 'json') {
    return (
      <div key={fieldKey} style={{ display: 'flex', gap: 6, flexDirection: 'column', marginTop: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
            {title}
          </label>
          {isObjectItems && (
            <button
              type="button"
              onClick={() => setMode('form')}
              style={{
                fontSize: 11,
                padding: '2px 6px',
                borderRadius: 4,
                border: '1px solid var(--border)',
                background: 'var(--bg-2, #f3f4f6)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              Форма
            </button>
          )}
        </div>
        <textarea
          value={
            typeof currentValue === 'string'
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
            fontFamily: 'monospace',
            padding: '6px 8px',
            border: '1px solid var(--border)',
            borderRadius: 4,
            background: 'var(--bg-primary, #fff)',
            color: 'var(--text-primary)',
          }}
        />
      </div>
    );
  }

  const subProperties = itemSchema.properties as Record<string, Record<string, unknown>>;

  return (
    <div key={fieldKey} style={{ display: 'flex', gap: 8, flexDirection: 'column', marginTop: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
          {title} ({itemsArray.length})
        </label>
        <button
          type="button"
          onClick={() => setMode('json')}
          style={{
            fontSize: 11,
            padding: '2px 6px',
            borderRadius: 4,
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
          title="Редагувати як JSON"
        >
          JSON
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {itemsArray.map((item, index) => {
          const itemObj = (typeof item === 'object' && item !== null ? item : {}) as Record<string, unknown>;
          return (
            <div
              key={index}
              style={{
                display: 'flex',
                gap: 6,
                alignItems: 'center',
                padding: '6px 8px',
                background: 'var(--bg-2, rgba(128,128,128,0.05))',
                border: '1px solid var(--border, #e5e7eb)',
                borderRadius: 6,
                flexWrap: 'wrap',
              }}
            >
              {Object.entries(subProperties).map(([propName, propDef]) => {
                const pTitle = (propDef.title as string) || propName;
                const pVal = itemObj[propName] ?? '';
                const isEnum = Array.isArray(propDef.enum);

                if (isEnum) {
                  return (
                    <select
                      key={propName}
                      value={String(pVal || propDef.default || '')}
                      onChange={(e) => handleItemChange(index, propName, e.target.value)}
                      title={pTitle}
                      style={{
                        fontSize: 12,
                        padding: '4px 6px',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        background: 'var(--bg-primary, #fff)',
                        color: 'var(--text-primary)',
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
                      flex: propName === 'url' ? 2 : 1,
                      minWidth: 80,
                      fontSize: 12,
                      padding: '4px 6px',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      background: 'var(--bg-primary, #fff)',
                      color: 'var(--text-primary)',
                    }}
                  />
                );
              })}

              <button
                type="button"
                onClick={() => handleDeleteItem(index)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--danger, #ef4444)',
                  cursor: 'pointer',
                  padding: '2px 6px',
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
          style={{
            fontSize: 11,
            padding: '4px 10px',
            alignSelf: 'flex-start',
            cursor: 'pointer',
          }}
        >
          + Додати пункт
        </button>
      </div>
    </div>
  );
}

export function SchemaField({ props, schema, onChange }: SchemaFieldProps): React.ReactNode {
  if (!schema || typeof schema !== 'object' || !schema.properties) {
    // No schema — render generic inputs for all props
    return Object.entries(props).map(([key, value]) => (
      <div key={key} className="pb-be-field" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label className="pb-be-field-label" style={{ fontSize: 12, minWidth: 100, color: 'var(--text-secondary)' }}>
          {key}
        </label>
        <input
          type="text"
          className="pb-be-field-input"
          value={typeof value === 'string' ? value : JSON.stringify(value ?? '')}
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
            padding: '4px 8px',
            border: '1px solid var(--border)',
            borderRadius: 4,
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
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

    // Boolean field
    if (type === 'boolean') {
      return (
        <div key={key} className="pb-be-field" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label className="pb-be-field-label" style={{ fontSize: 12, minWidth: 100, color: 'var(--text-secondary)' }}>
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

    // Enum select
    if (type === 'string' && Array.isArray(propSchema.enum)) {
      return (
        <div key={key} className="pb-be-field" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label className="pb-be-field-label" style={{ fontSize: 12, minWidth: 100, color: 'var(--text-secondary)' }}>
            {title}
          </label>
          <select
            className="pb-be-field-input"
            value={String(currentValue ?? propSchema.default ?? '')}
            onChange={(e) => onChange(key, e.target.value)}
            style={{
              fontSize: 13,
              padding: '4px 8px',
              border: '1px solid var(--border)',
              borderRadius: 4,
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
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

    // Array field
    if (type === 'array') {
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

    // Number field
    if (type === 'number' || type === 'integer') {
      return (
        <div key={key} className="pb-be-field" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label className="pb-be-field-label" style={{ fontSize: 12, minWidth: 100, color: 'var(--text-secondary)' }}>
            {title}
          </label>
          <input
            type="number"
            className="pb-be-field-input"
            value={typeof currentValue === 'number' ? currentValue : ''}
            onChange={(e) => {
              const val = e.target.value === '' ? undefined : Number(e.target.value);
              onChange(key, val);
            }}
            style={{
              flex: 1,
              fontSize: 13,
              padding: '4px 8px',
              border: '1px solid var(--border)',
              borderRadius: 4,
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      );
    }

    // Default: text input
    return (
      <div key={key} className="pb-be-field" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label className="pb-be-field-label" style={{ fontSize: 12, minWidth: 100, color: 'var(--text-secondary)' }}>
          {title}
        </label>
        <input
          type="text"
          className="pb-be-field-input"
          value={
            typeof currentValue === 'string'
              ? currentValue
              : JSON.stringify(currentValue ?? '')
          }
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
            padding: '4px 8px',
            border: '1px solid var(--border)',
            borderRadius: 4,
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
          }}
        />
      </div>
    );
  });
}
