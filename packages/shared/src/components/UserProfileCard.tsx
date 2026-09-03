import { useState } from "react";
import { icons, type IconName } from "./icons";

const ico = (name: IconName, size = 16) => (
  <span style={{ display: "inline-flex", alignItems: "center", width: size, height: size, flexShrink: 0 }}>
    {icons[name]}
  </span>
);

/** Normalized user data — works for both platform (TWA+API) and admin (full DB row) */
export interface UserProfileData {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  language?: string | null;
  photoUrl?: string | null;
  isPremium?: boolean;
  isBot?: boolean;
  addedToMenu?: boolean;
  // DB fields
  role?: string | null;
  tariff?: string | null;
  status?: string | null;
  discount?: number | null;
  permissions?: string[];
  isBlocked?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  // Admin-only: raw DB fields
  rawFields?: Record<string, unknown>;
}

export interface UserProfileCardProps {
  user: UserProfileData;
  variant?: "platform" | "admin";
  loading?: boolean;
  error?: string | null;
  onEdit?: (userId: number) => void;
  onMessage?: (userId: number) => void;
  onClose?: () => void;
}

function FieldRow({ label, value, icon }: { label: string; value: React.ReactNode; icon?: IconName }) {
  return (
    <div className="profile-field">
      <div className="profile-field-label">
        {icon && ico(icon, 14)}
        <span>{label}</span>
      </div>
      <div className="profile-field-value">{value || "—"}</div>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    active: { bg: "var(--green-dim)", color: "var(--green)" },
    pending: { bg: "var(--yellow-dim)", color: "var(--yellow)" },
    suspended: { bg: "var(--red-dim)", color: "var(--red)" },
  };
  const c = colors[value] || { bg: "var(--surface-active)", color: "var(--text-secondary)" };
  return (
    <span style={{ background: c.bg, color: c.color, padding: "2px 10px", borderRadius: 9999, fontSize: 13, fontWeight: 600 }}>
      {value}
    </span>
  );
}

function RoleBadge({ value }: { value: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    admin: { bg: "var(--yellow-dim)", color: "var(--yellow)" },
    vip: { bg: "var(--accent-dim)", color: "var(--accent)" },
    moderator: { bg: "var(--accent-dim)", color: "var(--accent)" },
    user: { bg: "var(--surface-active)", color: "var(--text-secondary)" },
  };
  const c = colors[value] || colors.user;
  return (
    <span style={{ background: c.bg, color: c.color, padding: "2px 10px", borderRadius: 9999, fontSize: 13, fontWeight: 600 }}>
      {value}
    </span>
  );
}

/** Raw DB field key → human label */
const RAW_FIELD_LABELS: Record<string, string> = {
  my_dates: "Мої дати",
  active_scenario: "Активний сценарій",
  message_id: "Останнє повідомлення",
  topics: "Теми",
  admin: "Адмін",
  galyashop: "Галяшоп",
  ttt: "TTT",
};

/** Collapsible JSON viewer */
function JsonBlock({ label, value }: { label: string; value: unknown }) {
  const [expanded, setExpanded] = useState(false);
  const str = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  let summary = "—";
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (Array.isArray(parsed)) summary = `Масив [${parsed.length}]`;
    else if (typeof parsed === "object" && parsed !== null) summary = `Об'єкт {${Object.keys(parsed).length}}`;
  } catch { summary = str.length > 60 ? str.slice(0, 60) + "…" : str; }

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 13, color: "var(--text-muted, #888)", marginBottom: 4 }}>{label}</div>
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent, #6c5ce7)", fontSize: 13, padding: 0 }}
        >
          ▸ {summary}
        </button>
      ) : (
        <div>
          <button
            onClick={() => setExpanded(false)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent, #6c5ce7)", fontSize: 13, padding: 0, marginBottom: 4 }}
          >
            ▾ {summary}
          </button>
          <pre style={{ background: "var(--bg-2, #1a1a2e)", padding: 8, borderRadius: 6, fontSize: 11, overflow: "auto", margin: 0, whiteSpace: "pre-wrap" }}>
            {str}
          </pre>
        </div>
      )}
    </div>
  );
}

export function UserProfileCard({ user, variant = "platform", loading, error, onEdit, onMessage }: UserProfileCardProps) {
  if (loading) {
    return <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted, #888)" }}>Завантаження даних…</div>;
  }
  if (error) {
    return <div style={{ padding: 24, textAlign: "center", color: "#dc2626" }}>Помилка: {error}</div>;
  }
  if (!user) {
    return <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted, #888)" }}>Користувача не знайдено</div>;
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "—";

  return (
    <div>
      {/* ═══ Avatar + Name ═══ */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        {user.photoUrl ? (
          <img src={user.photoUrl} alt="Avatar" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "var(--accent, #6c5ce7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 28, fontWeight: 700, flexShrink: 0,
          }}>
            {(user.firstName || "?")[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{fullName}</div>
          {user.username && <div style={{ color: "var(--text-muted, #888)", fontSize: 14 }}>@{user.username}</div>}
          {variant === "admin" && (
            <div style={{ fontSize: 13, color: "var(--text-muted, #888)", marginTop: 2 }}>ID: {user.id}</div>
          )}
        </div>
      </div>

      {/* ═══ Telegram дані ═══ */}
      {variant === "platform" && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 12 }}>{ico("bot")} Telegram дані</h3>
          <div className="profile-fields">
            <FieldRow label="User ID" value={user.id} icon="info" />
            <FieldRow label="Ім'я" value={user.firstName} icon="edit" />
            <FieldRow label="Прізвище" value={user.lastName} icon="edit" />
            <FieldRow label="Username" value={user.username ? `@${user.username}` : null} icon="globe" />
            <FieldRow label="Мова" value={user.language} icon="globe" />
            <FieldRow label="Premium" value={user.isPremium === true ? "Так" : user.isPremium === false ? "Ні" : "—"} icon="sparkles" />
            <FieldRow label="Бот" value={user.isBot === true ? "Так" : user.isBot === false ? "Ні" : "—"} icon="bot" />
            <FieldRow label="Додано в меню" value={user.addedToMenu === true ? "Так" : user.addedToMenu === false ? "Ні" : "—"} icon="settings" />
          </div>
        </div>
      )}

      {/* ═══ Дані з бази ═══ */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>{ico("clipboard")} Дані з бази</h3>
        <div className="profile-fields">
          {variant === "admin" && (
            <FieldRow label="ID" value={user.id} icon="info" />
          )}
          {variant === "admin" && (
            <>
              <FieldRow label="Ім'я" value={user.firstName} icon="edit" />
              <FieldRow label="Прізвище" value={user.lastName} icon="edit" />
              <FieldRow label="Username" value={user.username ? `@${user.username}` : null} icon="globe" />
              <FieldRow label="Мова" value={user.language} icon="globe" />
            </>
          )}
          <FieldRow label="Роль" value={user.role ? <RoleBadge value={user.role} /> : null} icon="users" />
          <FieldRow label="Тариф" value={user.tariff} icon="sparkles" />
          <FieldRow label="Статус" value={user.status ? <StatusBadge value={user.status} /> : null} icon="check" />
          <FieldRow label="Знижка" value={user.discount ? `${user.discount}%` : null} icon="info" />
          <FieldRow label="Дозволи" value={user.permissions && user.permissions.length > 0 ? user.permissions.join(", ") : null} icon="lock" />
          <FieldRow label="Заблоковано" value={user.isBlocked ? "Так" : "Ні"} icon="lock" />
          {user.createdAt && <FieldRow label="Створено" value={user.createdAt} icon="info" />}
          {user.updatedAt && <FieldRow label="Оновлено" value={user.updatedAt} icon="info" />}
        </div>
      </div>

      {/* ═══ Admin-only: raw DB fields ═══ */}
      {variant === "admin" && user.rawFields && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 12 }}>{ico("settings")} Додаткові дані</h3>
          <div className="profile-fields">
            {Object.entries(user.rawFields).map(([key, val]) => {
              if (val === null || val === undefined || val === "") return null;
              const label = RAW_FIELD_LABELS[key] || key;
              if (typeof val === "object" || (typeof val === "string" && (val.startsWith("{") || val.startsWith("[")))) {
                return <JsonBlock key={key} label={label} value={val} />;
              }
              return <FieldRow key={key} label={label} value={String(val)} icon="info" />;
            })}
          </div>
        </div>
      )}

      {/* ═══ Raw JSON (для діагностики) ═══ */}
      {variant === "platform" && (
        <details style={{ marginTop: 16 }}>
          <summary style={{ cursor: "pointer", color: "var(--text-muted, #888)", fontSize: 13 }}>
            Показати сирий JSON
          </summary>
          <pre style={{ background: "var(--bg-2, #1a1a2e)", padding: 12, borderRadius: 8, fontSize: 12, overflow: "auto", marginTop: 8, whiteSpace: "pre-wrap" }}>
            {JSON.stringify(user, null, 2)}
          </pre>
        </details>
      )}

      {/* ═══ Actions (admin only) ═══ */}
      {variant === "admin" && (onEdit || onMessage) && (
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border, #e5e7eb)" }}>
          {onMessage && (
            <button className="wb-btn wb-btn-secondary wb-btn-sm" onClick={() => onMessage(user.id)}>
              {ico("mail")} Написати
            </button>
          )}
          {onEdit && (
            <button className="wb-btn wb-btn-primary wb-btn-sm" onClick={() => onEdit(user.id)}>
              {ico("edit")} Змінити
            </button>
          )}
        </div>
      )}
    </div>
  );
}
