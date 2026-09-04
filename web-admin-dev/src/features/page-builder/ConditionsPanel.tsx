/**
 * ConditionsPanel — панель редагування умов показу блоку.
 *
 * Дозволяє налаштувати: role, tariff, status, minDiscount, permissions.
 */

import { icons, type IconName } from '@wwwuabot/shared';
import type { BlockConditions } from '@wwwuabot/shared/types/page-config';

// ── Icon helper ───────────────────────────────────────────────────

const ico = (name: IconName, size = 14) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', width: size, height: size, flexShrink: 0 }}>
    {icons[name]}
  </span>
);

// ── Constants ─────────────────────────────────────────────────────

const AVAILABLE_ROLES = ['user', 'moderator', 'admin', 'vip'];
const AVAILABLE_TARIFFS = ['free', 'basic', 'pro', 'enterprise'];
const AVAILABLE_STATUSES = ['active', 'pending', 'suspended'];
const AVAILABLE_PERMISSIONS = ['analytics', 'export', 'messaging', 'settings', 'users', 'billing'];

// ── Props ─────────────────────────────────────────────────────────

interface ConditionsPanelProps {
  /** Поточні умови блоку. */
  conditions: BlockConditions | undefined;

  /** Callback: оновити умови. */
  onUpdate: (conditions: BlockConditions | undefined) => void;
}

// ── Component ─────────────────────────────────────────────────────

export function ConditionsPanel({ conditions, onUpdate }: ConditionsPanelProps) {
  function updateConditions(patch: Partial<BlockConditions>) {
    const current = conditions ?? {};
    const next = { ...current, ...patch };

    // Clean up empty arrays
    if (next.role && next.role.length === 0) delete next.role;
    if (next.tariff && next.tariff.length === 0) delete next.tariff;
    if (next.status && next.status.length === 0) delete next.status;
    if (next.minDiscount === undefined || next.minDiscount === 0) delete next.minDiscount;
    if (next.permissions && next.permissions.length === 0) delete next.permissions;

    const isEmpty = !next.role && !next.tariff && !next.status && !next.minDiscount && !next.permissions;
    onUpdate(isEmpty ? undefined : next);
  }

  function toggleArrayValue(field: 'role' | 'tariff' | 'status' | 'permissions', value: string) {
    const arr = (conditions?.[field] as string[] | undefined) ?? [];
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    updateConditions({ [field]: next });
  }

  return (
    <div style={{
      marginBottom: 12,
      padding: 10,
      border: '1px solid var(--border)',
      borderRadius: 6,
      background: 'var(--bg-secondary, #f9fafb)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
        {ico('eye')} Умови показу блоку
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8 }}>
        Блок показується тільки якщо ВСІ умови виконуються. Якщо жодна не вказана — блок показується завжди.
      </div>

      {/* Role */}
      <div style={{ marginBottom: 8 }}>
        <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Роль</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {AVAILABLE_ROLES.map((r) => (
            <ToggleButton
              key={r}
              label={r}
              isActive={(conditions?.role ?? []).includes(r)}
              onClick={() => toggleArrayValue('role', r)}
            />
          ))}
        </div>
      </div>

      {/* Tariff */}
      <div style={{ marginBottom: 8 }}>
        <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Тариф</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {AVAILABLE_TARIFFS.map((t) => (
            <ToggleButton
              key={t}
              label={t}
              isActive={(conditions?.tariff ?? []).includes(t)}
              onClick={() => toggleArrayValue('tariff', t)}
            />
          ))}
        </div>
      </div>

      {/* Status */}
      <div style={{ marginBottom: 8 }}>
        <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Статус</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {AVAILABLE_STATUSES.map((s) => (
            <ToggleButton
              key={s}
              label={s}
              isActive={(conditions?.status ?? []).includes(s)}
              onClick={() => toggleArrayValue('status', s)}
            />
          ))}
        </div>
      </div>

      {/* Min Discount */}
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 11, fontWeight: 600, minWidth: 80 }}>Мін. знижка (%)</label>
        <input
          type="number"
          min={0}
          max={100}
          value={conditions?.minDiscount ?? ''}
          placeholder="0"
          onChange={(e) => {
            const v = Number(e.target.value);
            updateConditions({ minDiscount: v > 0 ? v : undefined });
          }}
          style={{
            width: 60,
            fontSize: 12,
            padding: '2px 6px',
            border: '1px solid var(--border)',
            borderRadius: 4,
          }}
        />
      </div>

      {/* Permissions */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Дозволи</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {AVAILABLE_PERMISSIONS.map((p) => (
            <ToggleButton
              key={p}
              label={p}
              isActive={(conditions?.permissions ?? []).includes(p)}
              onClick={() => toggleArrayValue('permissions', p)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Toggle Button ─────────────────────────────────────────────────

function ToggleButton({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 4,
        border: `1px solid ${isActive ? 'var(--accent, #6366f1)' : 'var(--border)'}`,
        background: isActive ? 'var(--accent, #6366f1)' : 'transparent',
        color: isActive ? '#fff' : 'var(--text-secondary)',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}
