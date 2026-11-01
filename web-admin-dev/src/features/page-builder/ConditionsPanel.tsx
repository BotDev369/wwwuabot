/**
 * ConditionsPanel — панель редагування умов показу блоку.
 *
 * Дозволяє налаштувати: role, tariff, status, minDiscount, permissions.
 *
 * Вигляд живе в `styles/admin/page-builder.css` (класи `pb-cond*`): панель,
 * пігулки й числове поле — це ролі, а не числа конкретного екрана.
 */

import { icons, type IconName } from "@wwwuabot/shared";
import type { BlockConditions } from "@wwwuabot/shared/types/page-config";

// ── Icon helper ───────────────────────────────────────────────────

const ico = (name: IconName) => <span className="pb-icon">{icons[name]}</span>;

// ── Constants ─────────────────────────────────────────────────────

const AVAILABLE_ROLES = ["user", "moderator", "admin", "vip"];
const AVAILABLE_TARIFFS = ["free", "basic", "pro", "enterprise"];
const AVAILABLE_STATUSES = ["active", "pending", "suspended"];
const AVAILABLE_PERMISSIONS = ["analytics", "export", "messaging", "settings", "users", "billing"];

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

    const isEmpty =
      !next.role && !next.tariff && !next.status && !next.minDiscount && !next.permissions;
    onUpdate(isEmpty ? undefined : next);
  }

  function toggleArrayValue(field: "role" | "tariff" | "status" | "permissions", value: string) {
    const arr = (conditions?.[field] as string[] | undefined) ?? [];
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    updateConditions({ [field]: next });
  }

  return (
    <div className="pb-cond">
      <div className="pb-cond__title">{ico("eye")} Умови показу блоку</div>
      <div className="pb-cond__hint">
        Блок показується тільки якщо ВСІ умови виконуються. Якщо жодна не вказана — блок показується
        завжди.
      </div>

      {/* Role */}
      <div className="pb-cond__field">
        <label className="pb-cond__label">Роль</label>
        <div className="pb-cond__pills">
          {AVAILABLE_ROLES.map((r) => (
            <ToggleButton
              key={r}
              label={r}
              isActive={(conditions?.role ?? []).includes(r)}
              onClick={() => toggleArrayValue("role", r)}
            />
          ))}
        </div>
      </div>

      {/* Tariff */}
      <div className="pb-cond__field">
        <label className="pb-cond__label">Тариф</label>
        <div className="pb-cond__pills">
          {AVAILABLE_TARIFFS.map((t) => (
            <ToggleButton
              key={t}
              label={t}
              isActive={(conditions?.tariff ?? []).includes(t)}
              onClick={() => toggleArrayValue("tariff", t)}
            />
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="pb-cond__field">
        <label className="pb-cond__label">Статус</label>
        <div className="pb-cond__pills">
          {AVAILABLE_STATUSES.map((s) => (
            <ToggleButton
              key={s}
              label={s}
              isActive={(conditions?.status ?? []).includes(s)}
              onClick={() => toggleArrayValue("status", s)}
            />
          ))}
        </div>
      </div>

      {/* Min Discount */}
      <div className="pb-cond__row">
        <label className="pb-cond__label pb-cond__label--inline">Мін. знижка (%)</label>
        <input
          type="number"
          min={0}
          max={100}
          value={conditions?.minDiscount ?? ""}
          placeholder="0"
          onChange={(e) => {
            const v = Number(e.target.value);
            updateConditions({ minDiscount: v > 0 ? v : undefined });
          }}
          className="pb-cond__number"
        />
      </div>

      {/* Permissions */}
      <div className="pb-cond__field">
        <label className="pb-cond__label">Дозволи</label>
        <div className="pb-cond__pills">
          {AVAILABLE_PERMISSIONS.map((p) => (
            <ToggleButton
              key={p}
              label={p}
              isActive={(conditions?.permissions ?? []).includes(p)}
              onClick={() => toggleArrayValue("permissions", p)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Toggle Button ─────────────────────────────────────────────────

function ToggleButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`pb-cond__toggle${isActive ? " pb-cond__toggle--active" : ""}`}
    >
      {label}
    </button>
  );
}
