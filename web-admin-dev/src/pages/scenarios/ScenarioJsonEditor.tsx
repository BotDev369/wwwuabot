/**
 * ScenarioJsonEditor — JSON-редактор для редагування полів сценарію.
 *
 * Містить toolbar (копіювати, форматувати, застосувати),
 * textarea з валідацією та статус-бар.
 */

import { icons, type IconName } from '@wwwuabot/shared';

// ── Icon helper ───────────────────────────────────────────────────

const ico = (name: IconName, size = 16) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', width: size, height: size, flexShrink: 0 }}>
    {icons[name]}
  </span>
);

// ── Props ─────────────────────────────────────────────────────────

interface ScenarioJsonEditorProps {
  jsonText: string;
  jsonError: string | null;
  copied: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (v: string) => void;
  onCopy: () => void;
  onFormat: () => void;
  onApply: () => void;
}

// ── Component ─────────────────────────────────────────────────────

export function ScenarioJsonEditor({
  jsonText,
  jsonError,
  copied,
  textareaRef,
  onChange,
  onCopy,
  onFormat,
  onApply,
}: ScenarioJsonEditorProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 12px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <button className="wb-btn wb-btn-secondary" onClick={onCopy} style={{ fontSize: 12, padding: '4px 10px' }}>
          {copied ? <>{ico('check')} Скопійовано</> : <>{ico('copy')} Копіювати</>}
        </button>
        <button className="wb-btn wb-btn-secondary" onClick={onFormat} style={{ fontSize: 12, padding: '4px 10px' }}>
          {ico('sparkles')} Форматувати
        </button>
        <button className="wb-btn wb-btn-primary" onClick={onApply} disabled={!!jsonError || !jsonText.trim()} style={{ fontSize: 12, padding: '4px 10px' }}>
          {ico('check')} Застосувати
        </button>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={jsonText}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        style={{
          width: '100%',
          height: 250,
          minHeight: 150,
          padding: '12px 16px',
          border: '1px solid var(--border)',
          borderRadius: 6,
          outline: 'none',
          resize: 'vertical',
          fontFamily: 'monospace',
          fontSize: 12,
          lineHeight: 1.5,
          background: 'var(--bg-primary, #ffffff)',
          color: 'var(--text-primary, #1a1a2e)',
          caretColor: 'var(--text-primary, #1a1a2e)',
          tabSize: 2,
        }}
      />

      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>
        <div>
          {jsonError ? (
            <span style={{ color: 'var(--color-error, #ef4444)' }}>⚠️ {jsonError}</span>
          ) : jsonText.trim() ? (
            <span style={{ color: 'var(--color-success, #22c55e)' }}>✓ Валідний JSON</span>
          ) : null}
        </div>
        <div>{jsonText.length.toLocaleString()} символів</div>
      </div>
    </div>
  );
}
