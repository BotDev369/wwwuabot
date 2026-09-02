import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/app.store";
import { apiFetch } from "@/shared/api/client";
import { icons, type IconName } from "@wwwuabot/shared";

const ico = (name: IconName, size = 18) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      width: size,
      height: size,
      flexShrink: 0,
    }}
  >
    {icons[name]}
  </span>
);

/** Telegram WebApp user data from initDataUnsafe */
interface TgUser {
  id?: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
  added_to_attachment_menu?: boolean;
}

/** User profile from our database API */
interface DbProfile {
  user_id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language?: string;
  role?: string;
  tariff?: string;
  status?: string;
  discount?: number;
  permissions?: string[];
  is_blocked?: number;
  created_at?: string;
  updated_at?: string;
}

function getTgUser(): TgUser | null {
  try {
    const tg = (window as any).Telegram?.WebApp;
    return tg?.initDataUnsafe?.user ?? null;
  } catch {
    return null;
  }
}

function FieldRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: IconName;
}) {
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
    active: { bg: "#ecfdf5", color: "#059669" },
    pending: { bg: "#fef3c7", color: "#d97706" },
    suspended: { bg: "#fee2e2", color: "#dc2626" },
  };
  const c = colors[value] || { bg: "#f3f4f6", color: "#6b7280" };
  return (
    <span
      className="status-badge"
      style={{ background: c.bg, color: c.color, padding: "2px 10px", borderRadius: 9999, fontSize: 13, fontWeight: 600 }}
    >
      {value}
    </span>
  );
}

function RoleBadge({ value }: { value: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    admin: { bg: "#fef3c7", color: "#d97706" },
    vip: { bg: "#f5f3ff", color: "#7c3aed" },
    moderator: { bg: "#dbeafe", color: "#2563eb" },
    user: { bg: "#f3f4f6", color: "#6b7280" },
  };
  const c = colors[value] || colors.user;
  return (
    <span
      style={{ background: c.bg, color: c.color, padding: "2px 10px", borderRadius: 9999, fontSize: 13, fontWeight: 600 }}
    >
      {value}
    </span>
  );
}

export function ProfilePage() {
  const setScenarioName = useAppStore((s) => s.setScenarioName);
  const [tgUser, setTgUser] = useState<TgUser | null>(null);
  const [dbProfile, setDbProfile] = useState<DbProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setScenarioName("Профіль");
  }, [setScenarioName]);

  useEffect(() => {
    const user = getTgUser();
    setTgUser(user);

    if (user?.id) {
      apiFetch<{ ok: boolean; user?: { id: number; firstName?: string; lastName?: string; username?: string; language?: string; role?: string; tariff?: string; status?: string; discount?: number; permissions?: string[] } }>(`/api/user/profile?user_id=${user.id}`)
        .then((res) => {
          if (res.ok && res.user) {
            // Map API response (camelCase) to DbProfile (snake_case)
            const u = res.user;
            setDbProfile({
              user_id: u.id,
              first_name: u.firstName,
              last_name: u.lastName,
              username: u.username,
              language: u.language,
              role: u.role,
              tariff: u.tariff,
              status: u.status,
              discount: u.discount,
              permissions: u.permissions,
              is_blocked: 0,
              created_at: "",
              updated_at: "",
            });
          }
        })
        .catch((e) => setError(`Помилка завантаження профілю: ${String(e).slice(0, 100)}`))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <main>
        <section className="hero">
          <p className="status-text">Завантажуємо профіль...</p>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="hero">
        <div className="page-header">
          <h1>Профіль</h1>
        </div>

        {error && <p className="status-text error">{error}</p>}

        {/* ═══ Telegram Avatar + Name ═══ */}
        {tgUser && (
          <div className="profile-card" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            {tgUser.photo_url ? (
              <img
                src={tgUser.photo_url}
                alt="Avatar"
                style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "var(--accent, #6c5ce7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 28,
                  fontWeight: 700,
                }}
              >
                {(tgUser.first_name || "?")[0].toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {tgUser.first_name} {tgUser.last_name || ""}
              </div>
              {tgUser.username && (
                <div style={{ color: "var(--text-muted, #888)", fontSize: 14 }}>
                  @{tgUser.username}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ Section: Telegram дані ═══ */}
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 12 }}>{ico("bot")} Telegram дані</h3>
          <div className="profile-fields">
            <FieldRow label="User ID" value={tgUser?.id} icon="info" />
            <FieldRow label="Ім'я" value={tgUser?.first_name} icon="edit" />
            <FieldRow label="Прізвище" value={tgUser?.last_name} icon="edit" />
            <FieldRow label="Username" value={tgUser?.username ? `@${tgUser.username}` : null} icon="globe" />
            <FieldRow label="Мова" value={tgUser?.language_code} icon="globe" />
            <FieldRow
              label="Premium"
              value={
                tgUser?.is_premium ? (
                  <span style={{ color: "#d97706", fontWeight: 600 }}>Так</span>
                ) : (
                  "Ні"
                )
              }
              icon="sparkles"
            />
            <FieldRow label="Бот" value={tgUser?.is_bot ? "Так" : "Ні"} icon="bot" />
            <FieldRow
              label="Додано в меню"
              value={tgUser?.added_to_attachment_menu ? "Так" : "Ні"}
              icon="settings"
            />
          </div>
        </div>

        {/* ═══ Section: Дані з бази ═══ */}
        {dbProfile && (
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>{ico("clipboard")} Дані з бази</h3>
            <div className="profile-fields">
              <FieldRow label="Роль" value={dbProfile.role ? <RoleBadge value={dbProfile.role} /> : null} icon="users" />
              <FieldRow label="Тариф" value={dbProfile.tariff} icon="sparkles" />
              <FieldRow
                label="Статус"
                value={dbProfile.status ? <StatusBadge value={dbProfile.status} /> : null}
                icon="check"
              />
              <FieldRow
                label="Знижка"
                value={dbProfile.discount ? `${dbProfile.discount}%` : null}
                icon="info"
              />
              <FieldRow
                label="Дозволи"
                value={
                  dbProfile.permissions && dbProfile.permissions.length > 0
                    ? dbProfile.permissions.join(", ")
                    : null
                }
                icon="lock"
              />
              <FieldRow label="Заблоковано" value={dbProfile.is_blocked ? "Так" : "Ні"} icon="lock" />
              <FieldRow label="Створено" value={dbProfile.created_at} icon="info" />
              <FieldRow label="Оновлено" value={dbProfile.updated_at} icon="info" />
            </div>
          </div>
        )}

        {/* ═══ Raw Data (для діагностики) ═══ */}
        <details style={{ marginTop: 24 }}>
          <summary style={{ cursor: "pointer", color: "var(--text-muted, #888)", fontSize: 13 }}>
            Показати сирий JSON
          </summary>
          <pre
            style={{
              background: "var(--bg-2, #1a1a2e)",
              padding: 12,
              borderRadius: 8,
              fontSize: 12,
              overflow: "auto",
              marginTop: 8,
              whiteSpace: "pre-wrap",
            }}
          >
            {JSON.stringify({ tgUser, dbProfile }, null, 2)}
          </pre>
        </details>
      </section>
    </main>
  );
}
