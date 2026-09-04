/**
 * FullscreenBuilder — повноекранний оверлей для Page Builder.
 */

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

interface FullscreenBuilderProps {
  codeword: string;
  allFields: Record<string, unknown>;
  updateField: (key: string, value: unknown) => void;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────

export function FullscreenBuilder({ codeword, allFields, updateField, onClose }: FullscreenBuilderProps) {
  let cfg = createEmptyPageConfig();
  try {
    const raw = allFields.page_data;
    const parsed = typeof raw === 'string'
      ? parsePageConfig(raw)
      : typeof raw === 'object' && raw !== null
        ? (raw as PageConfig)
        : null;
    if (parsed) cfg = parsed;
  } catch { /* ignore */ }

  return (
    <div
      className="scn-fullscreen-builder"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--bg-1)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-2)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14 }}>
          {ico('construction')} Конструктор: {codeword}
        </span>
        <button
          className="wb-btn wb-btn-secondary"
          onClick={onClose}
          style={{ fontSize: 12, padding: '4px 10px' }}
        >
          {ico('close')} Закрити
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        <PageBuilderInline
          config={cfg}
          onChange={(newCfg) => updateField('page_data', JSON.stringify(newCfg))}
          codeword={codeword}
          title={String(allFields.title ?? '')}
          photoUrl={String(allFields.photo_url ?? '')}
        />
      </div>
    </div>
  );
}
