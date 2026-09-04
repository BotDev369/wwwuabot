/**
 * BotRichConstructor — конструктор для "Бот-Річ + Кнопки".
 *
 * Містить: rich_message toggle, форматовані caption-поля (RichTextSection),
 * JSON-редактор rich_data блоків (RichDataEditor), клавіатуру.
 *
 * Підкомпоненти:
 * - RichTextSection — lazy-завантаження RichTextField для caption полів
 * - RichDataEditor — JSON/visual редактор блоків rich_data
 */

import { useState, useEffect, useRef } from 'react';
import { icons, type IconName } from '@wwwuabot/shared';
import { ButtonsField } from '../../features/scenarios/keyboard/ButtonsField';

// ── Icon helper ───────────────────────────────────────────────────

const ico = (name: IconName, size = 16) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', width: size, height: size, flexShrink: 0 }}>
    {icons[name]}
  </span>
);

// ── Props ─────────────────────────────────────────────────────────

interface BotRichConstructorProps {
  fields: Record<string, unknown>;
  updateField: (key: string, value: unknown) => void;
}

// ── Main Component ────────────────────────────────────────────────

export function BotRichConstructor({ fields, updateField }: BotRichConstructorProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Rich message toggle */}
      <div className="wb-card">
        <div className="wb-card-header">
          <span className="wb-card-title">{ico('sparkles')} Річ-повідомлення</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={fields.rich_message === 'true' || fields.rich_message === '1'}
              onChange={(e) => updateField('rich_message', e.target.checked ? 'true' : 'false')}
            />
            Увімкнути Rich Message
          </label>
        </div>
      </div>

      {/* Rich text fields for caption using RichTextField */}
      <RichTextSection fields={fields} updateField={updateField} />

      {/* Rich data blocks */}
      <div className="wb-card">
        <div className="wb-card-header">
          <span className="wb-card-title">{ico('blocks')} Блоки повідомлення (rich_data)</span>
        </div>
        <div style={{ padding: 12 }}>
          <RichDataEditor
            value={String(fields.rich_data ?? '')}
            onChange={(v) => updateField('rich_data', v)}
          />
        </div>
      </div>

      {/* Keyboard / Buttons for rich messages */}
      <div className="wb-card">
        <div className="wb-card-header">
          <span className="wb-card-title">{ico('keyboard')} Клавіатура (кнопки)</span>
        </div>
        <div style={{ padding: 12 }}>
          <ButtonsField
            value={String(fields.buttons ?? '')}
            onChange={(v) => updateField('buttons', v)}
          />
        </div>
      </div>
    </div>
  );
}

// ── Rich Text Section (caption fields with formatting) ────────────

function RichTextSection({
  fields,
  updateField,
}: {
  fields: Record<string, unknown>;
  updateField: (key: string, value: unknown) => void;
}) {
  // Lazy load RichTextField to avoid circular deps
  const [RichTextField, setRichTextField] = useState<React.ComponentType<{
    value: unknown;
    onChange: (next: unknown) => void;
    multiline?: boolean;
    placeholder?: string;
    showPreview?: boolean;
  }> | null>(null);

  useEffect(() => {
    import('../../features/editor/richtext/RichTextField').then((mod) => {
      setRichTextField(() => mod.RichTextField);
    });
  }, []);

  if (!RichTextField) return <div style={{ padding: 12, color: 'var(--text-muted)' }}>Завантаження редактора...</div>;

  return (
    <>
      <div className="wb-card">
        <div className="wb-card-header">
          <span className="wb-card-title">{ico('edit')} Caption Top (форматований)</span>
        </div>
        <div style={{ padding: 12 }}>
          <RichTextField
            value={fields.caption_top ?? ''}
            onChange={(v) => updateField('caption_top', v)}
            multiline
            placeholder="Верхній підпис..."
          />
        </div>
      </div>
      <div className="wb-card">
        <div className="wb-card-header">
          <span className="wb-card-title">{ico('edit')} Caption Mid (форматований)</span>
        </div>
        <div style={{ padding: 12 }}>
          <RichTextField
            value={fields.caption_mid ?? ''}
            onChange={(v) => updateField('caption_mid', v)}
            multiline
            placeholder="Середній підпис..."
          />
        </div>
      </div>
      <div className="wb-card">
        <div className="wb-card-header">
          <span className="wb-card-title">{ico('edit')} Caption Bot (форматований)</span>
        </div>
        <div style={{ padding: 12 }}>
          <RichTextField
            value={fields.caption_bot ?? ''}
            onChange={(v) => updateField('caption_bot', v)}
            multiline
            placeholder="Нижній підпис..."
          />
        </div>
      </div>
    </>
  );
}

// ── Rich Data Editor (block-based JSON editor) ────────────────────

function RichDataEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [mode, setMode] = useState<'visual' | 'json'>('visual');
  const [jsonText, setJsonText] = useState(value);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const lastEmitted = useRef(value);

  // Sync from external changes
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setJsonText(value);
    }
  }, [value]);

  function emit(next: string) {
    lastEmitted.current = next;
    onChange(next);
  }

  // Try to parse rich_data as blocks for visual display
  let blocks: unknown[] = [];
  try {
    const parsed = JSON.parse(value);
    blocks = Array.isArray(parsed) ? parsed : [];
  } catch {
    blocks = [];
  }

  return (
    <>
      <div className="kb-toggle">
        <button
          type="button"
          className={`kb-toggle-btn${mode === 'visual' ? ' kb-toggle-btn--active' : ''}`}
          onClick={() => {
            setMode('visual');
            // Re-emit current value to sync
            emit(jsonText);
          }}
        >
          Візуально
        </button>
        <button
          type="button"
          className={`kb-toggle-btn${mode === 'json' ? ' kb-toggle-btn--active' : ''}`}
          onClick={() => {
            setMode('json');
            setJsonText(JSON.stringify(blocks, null, 2));
            setJsonError(null);
          }}
        >
          JSON
        </button>
      </div>

      {mode === 'visual' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {blocks.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Блоків немає. Перейдіть в JSON щоб додати блоки.
            </div>
          ) : (
            blocks.map((block, i) => {
              const b = block as Record<string, unknown>;
              const type = String(b.type || 'unknown');
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontWeight: 600, minWidth: 80 }}>{type}</span>
                  <span style={{ flex: 1, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {String(b.text ?? b.summary ?? b.url ?? '').slice(0, 80)}
                  </span>
                </div>
              );
            })
          )}
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            Для додавання/редагування блоків використовуйте JSON-режим
          </div>
        </div>
      ) : (
        <>
          <textarea
            className="wb-textarea"
            rows={12}
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setJsonError(null);
              try {
                const parsed = JSON.parse(e.target.value);
                if (Array.isArray(parsed)) {
                  emit(e.target.value);
                }
              } catch {
                // Don't emit invalid JSON
              }
            }}
            style={{ fontFamily: 'monospace', fontSize: 12, tabSize: 2 }}
          />
          {jsonError && (
            <p style={{ color: 'var(--color-error, #ef4444)', fontSize: 12, marginTop: 4 }}>
              ⚠️ {jsonError}
            </p>
          )}
        </>
      )}
    </>
  );
}
