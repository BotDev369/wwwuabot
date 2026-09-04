/**
 * WebConstructor — конструктор для "Веб" (Page Builder).
 *
 * Використовує PageBuilderInline для візуального редагування сторінки.
 */

import { useCallback } from 'react';
import { icons, type IconName } from '@wwwuabot/shared';
import type { PageConfig } from '@wwwuabot/shared/types/page-config';
import { parsePageConfig, createEmptyPageConfig } from '@wwwuabot/shared/types/page-config';
import { PageBuilderInline } from '../../features/page-builder/PageBuilderInline';

// ── Icon helper ───────────────────────────────────────────────────

const ico = (name: IconName, size = 16) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', width: size, height: size, flexShrink: 0 }}>
    {icons[name]}
  </span>
);

// ── Props ─────────────────────────────────────────────────────────

interface WebConstructorProps {
  fields: Record<string, unknown>;
  updateField: (key: string, value: unknown) => void;
  codeword: string;
  onFullscreen?: () => void;
}

// ── Component ─────────────────────────────────────────────────────

export function WebConstructor({ fields, updateField, codeword, onFullscreen }: WebConstructorProps) {
  let config: PageConfig = createEmptyPageConfig();
  try {
    const raw = fields.page_data;
    const parsed = typeof raw === 'string'
      ? parsePageConfig(raw)
      : typeof raw === 'object' && raw !== null
        ? (raw as PageConfig)
        : null;
    if (parsed) config = parsed;
  } catch {
    config = createEmptyPageConfig();
  }

  const handleChange = useCallback((newConfig: PageConfig) => {
    updateField('page_data', JSON.stringify(newConfig));
  }, [updateField]);

  return (
    <div style={{ padding: '0 0 16px' }}>
      <div style={{ marginBottom: 8, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {ico('construction', 14)} Конструктор
        </span>
        {onFullscreen && (
          <button
            className="wb-btn wb-btn-secondary"
            onClick={onFullscreen}
            style={{ fontSize: 11, padding: '3px 8px' }}
            title="Відкрити конструктор на весь екран"
          >
            {ico('eye', 14)} <span className="scn-hide-mobile">На весь екран</span>
          </button>
        )}
      </div>
      <PageBuilderInline
        config={config}
        onChange={handleChange}
        codeword={codeword}
        title={String(fields.title ?? '')}
        photoUrl={String(fields.photo_url ?? '')}
      />
    </div>
  );
}
