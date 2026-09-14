import type { ReactNode } from "react";
import { Icon } from "@wwwuabot/shared";
import { PERMISSIONS, ROLES, STATUSES, TARIFFS } from "./constants";

/** Рядок форми: підпис фіксованої ширини + поле. */
function FormRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <label style={{ minWidth: 100, fontSize: 13, fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <FormRow label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="wb-input"
        style={{ flex: 1 }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </FormRow>
  );
}

function PermissionChip({
  perm,
  active,
  onToggle,
}: {
  perm: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        padding: "4px 10px",
        fontSize: 12,
        borderRadius: 6,
        border: `1px solid ${active ? "var(--accent, #6366f1)" : "var(--border, #e5e7eb)"}`,
        background: active ? "var(--accent, #6366f1)" : "var(--bg-secondary, #f9fafb)",
        color: active ? "#fff" : "var(--text-primary, #111827)",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {perm}
    </button>
  );
}

export function PermissionFields({
  role,
  tariff,
  status,
  discount,
  permissions,
  onRole,
  onTariff,
  onStatus,
  onDiscount,
  onTogglePermission,
}: {
  role: string;
  tariff: string;
  status: string;
  discount: number;
  permissions: string[];
  onRole: (v: string) => void;
  onTariff: (v: string) => void;
  onStatus: (v: string) => void;
  onDiscount: (v: number) => void;
  onTogglePermission: (perm: string) => void;
}) {
  return (
    <div className="wb-card">
      <div className="wb-card-header">
        <span className="wb-card-title">
          <Icon name="settings" /> Профіль та права
        </span>
      </div>
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
        <SelectField label="Роль" value={role} options={ROLES} onChange={onRole} />
        <SelectField label="Тариф" value={tariff} options={TARIFFS} onChange={onTariff} />
        <SelectField label="Статус" value={status} options={STATUSES} onChange={onStatus} />

        <FormRow label="Знижка (%)">
          <input
            type="number"
            min={0}
            max={100}
            value={discount}
            onChange={(e) => onDiscount(Number(e.target.value))}
            className="wb-input"
            style={{ flex: 1 }}
          />
        </FormRow>

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            Дозволи
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {PERMISSIONS.map((perm) => (
              <PermissionChip
                key={perm}
                perm={perm}
                active={permissions.includes(perm)}
                onToggle={() => onTogglePermission(perm)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
