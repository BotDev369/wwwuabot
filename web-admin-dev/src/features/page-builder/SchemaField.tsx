/**
 * SchemaField — рекурсивний рендерер полів для props на основі JSON Schema.
 *
 * Підтримує: string, boolean, enum, array, number.
 * Якщо schema не вказана — рендерить generic text input для кожного ключа.
 */

import React from 'react';

interface SchemaFieldProps {
  /** Поточні значення props. */
  props: Record<string, unknown>;

  /** JSON Schema для валідації. */
  schema: Record<string, unknown> | undefined;

  /** Callback: змінити значення поля. */
  onChange: (key: string, value: unknown) => void;
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
        <div key={key} style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {title}
          </label>
          <textarea
            value={
              typeof currentValue === 'string'
                ? currentValue
                : JSON.stringify(currentValue ?? [], null, 2)
            }
            onChange={(e) => {
              try {
                onChange(key, JSON.parse(e.target.value));
              } catch {
                onChange(key, e.target.value);
              }
            }}
            rows={4}
            style={{
              fontSize: 12,
              fontFamily: 'monospace',
              padding: '6px 8px',
              border: '1px solid var(--border)',
              borderRadius: 4,
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
          }}
        />
      </div>
    );
  });
}
