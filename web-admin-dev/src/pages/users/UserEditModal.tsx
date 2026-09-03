import { useEffect, useState } from "react";
import { readUser, updateUser, type UserRow } from "../../shared/api/users.api";
import { icons } from "@wwwuabot/shared";

const ico = (name: keyof typeof icons, size = 16) => (
  <span style={{ display: "inline-flex", alignItems: "center", width: size, height: size, flexShrink: 0 }}>
    {icons[name]}
  </span>
);

const ROLES = ["user", "moderator", "admin", "vip"];
const TARIFFS = ["free", "basic", "pro", "enterprise"];
const STATUSES = ["active", "pending", "suspended"];
const PERMISSIONS = ["analytics", "export", "messaging", "settings", "users", "billing"];

interface Props {
  userId: number;
  onClose: () => void;
  onSaved: () => void;
}

export function UserEditModal({ userId, onClose, onSaved }: Props) {
  const [user, setUser] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Typed fields ──
  const [role, setRole] = useState("user");
  const [tariff, setTariff] = useState("free");
  const [status, setStatus] = useState("active");
  const [discount, setDiscount] = useState(0);
  const [permissions, setPermissions] = useState<string[]>([]);

  // ── Generic fields (for unknown keys) ──
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    readUser(userId)
      .then((data) => {
        if (!cancelled && data) {
          setRole(String(data.role ?? "user"));
          setTariff(String(data.tariff ?? "free"));
          setStatus(String(data.status ?? "active"));
          setDiscount(Number(data.discount ?? 0));

          // Parse permissions (stored as JSON string or comma-separated)
          let perms: string[] = [];
          if (typeof data.permissions === "string" && data.permissions) {
            try {
              const parsed = JSON.parse(data.permissions);
              perms = Array.isArray(parsed) ? parsed : [];
            } catch {
              perms = data.permissions.split(",").map((s: string) => s.trim()).filter(Boolean);
            }
          }
          setPermissions(perms);

          // Extra fields (everything except the known typed fields and user_id)
          const SKIP = new Set(["user_id", "first_name", "last_name", "username", "language", "created_at", "is_blocked", "role", "tariff", "status", "discount", "permissions"]);
          const extra: Record<string, string> = {};
          for (const [k, v] of Object.entries(data)) {
            if (SKIP.has(k)) continue;
            if (v === null || v === undefined) extra[k] = "";
            else if (typeof v === "object") extra[k] = JSON.stringify(v, null, 2);
            else extra[k] = String(v);
          }
          setExtraFields(extra);

          setUser(data);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError((e as Error).message);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [userId]);

  function togglePermission(perm: string) {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const patch: Record<string, unknown> = {
        role,
        tariff,
        status,
        discount,
        permissions: JSON.stringify(permissions),
      };

      // Include extra fields
      for (const [k, v] of Object.entries(extraFields)) {
        if (v.startsWith("{") || v.startsWith("[")) {
          try { patch[k] = JSON.parse(v); } catch { patch[k] = v; }
        } else if (v === "") {
          patch[k] = null;
        } else {
          patch[k] = v;
        }
      }

      await updateUser(userId, patch);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="wb-modal-overlay" onClick={onClose}>
      <div className="wb-modal wb-modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="wb-modal-header">
          <span className="wb-modal-title">
            {ico("edit")} {loading ? "Завантаження…" : `Редагувати #${userId}`}
            {user?.username ? `  @${user.username}` : ""}
          </span>
          <button className="wb-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="wb-modal-body" style={{ overflow: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>Завантаження…</div>
          ) : error && !user ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--color-error, #ef4444)" }}>Помилка: {error}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 4px" }}>

              {/* ═══ PERMISSION FIELDS ═══ */}
              <div className="wb-card">
                <div className="wb-card-header">
                  <span className="wb-card-title">{ico("settings")} Профіль та права</span>
                </div>
                <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>

                  {/* Role */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={{ minWidth: 100, fontSize: 13, fontWeight: 600 }}>Роль</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="wb-input"
                      style={{ flex: 1 }}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tariff */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={{ minWidth: 100, fontSize: 13, fontWeight: 600 }}>Тариф</label>
                    <select
                      value={tariff}
                      onChange={(e) => setTariff(e.target.value)}
                      className="wb-input"
                      style={{ flex: 1 }}
                    >
                      {TARIFFS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={{ minWidth: 100, fontSize: 13, fontWeight: 600 }}>Статус</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="wb-input"
                      style={{ flex: 1 }}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Discount */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={{ minWidth: 100, fontSize: 13, fontWeight: 600 }}>Знижка (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      className="wb-input"
                      style={{ flex: 1 }}
                    />
                  </div>

                  {/* Permissions */}
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Дозволи</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {PERMISSIONS.map((perm) => (
                        <button
                          key={perm}
                          type="button"
                          onClick={() => togglePermission(perm)}
                          style={{
                            padding: "4px 10px",
                            fontSize: 12,
                            borderRadius: 6,
                            border: `1px solid ${permissions.includes(perm) ? "var(--accent, #6366f1)" : "var(--border, #e5e7eb)"}`,
                            background: permissions.includes(perm) ? "var(--accent, #6366f1)" : "var(--bg-secondary, #f9fafb)",
                            color: permissions.includes(perm) ? "#fff" : "var(--text-primary, #111827)",
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          {perm}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

              {/* ═══ USER INFO (read-only) ═══ */}
              <div className="wb-card">
                <div className="wb-card-header">
                  <span className="wb-card-title">{ico("users")} Інформація</span>
                </div>
                <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                  <div><strong>ID:</strong> {user?.user_id}</div>
                  <div><strong>Ім'я:</strong> {user?.first_name ?? "—"}</div>
                  <div><strong>Username:</strong> {user?.username ? `@${user.username}` : "—"}</div>
                  <div><strong>Мова:</strong> {user?.language ?? "—"}</div>
                  <div><strong>Створено:</strong> {user?.created_at ?? "—"}</div>
                </div>
              </div>

              {/* ═══ EXTRA FIELDS (JSON) ═══ */}
              {Object.keys(extraFields).length > 0 && (
                <div className="wb-card">
                  <div className="wb-card-header">
                    <span className="wb-card-title">{ico("wrench")} Додаткові поля</span>
                  </div>
                  <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    {Object.entries(extraFields).map(([key, val]) => (
                      <div key={key}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 2, color: "var(--text-secondary)" }}>{key}</label>
                        <textarea
                          className="wb-textarea"
                          rows={key.includes("data") || key.includes("json") || key.includes("topics") || key.includes("galyashop") || key.includes("ttt") ? 4 : 1}
                          value={val}
                          onChange={(e) => setExtraFields((prev) => ({ ...prev, [key]: e.target.value }))}
                          style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
          {error && <div style={{ padding: "8px 12px", color: "var(--color-error, #ef4444)", fontSize: 13 }}>{error}</div>}
        </div>

        <div className="wb-modal-footer">
          <button className="wb-btn wb-btn-secondary wb-btn-sm" onClick={onClose} disabled={saving}>
            Скасувати
          </button>
          <button className="wb-btn wb-btn-primary wb-btn-sm" onClick={handleSave} disabled={saving || loading}>
            {saving ? "Збереження…" : <>{ico("save")} Зберегти</>}
          </button>
        </div>
      </div>
    </div>
  );
}
