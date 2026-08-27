import { useEffect, useState } from "react";
import { readUser, updateUser, type UserRow } from "../../shared/api/users.api";

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
  const [fields, setFields] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    readUser(userId)
      .then((data) => {
        if (!cancelled && data) {
          // Convert all values to strings for editing
          const f: Record<string, string> = {};
          for (const [k, v] of Object.entries(data)) {
            if (k === "user_id") continue; // can't edit id
            if (v === null || v === undefined) {
              f[k] = "";
            } else if (typeof v === "object") {
              f[k] = JSON.stringify(v, null, 2);
            } else {
              f[k] = String(v);
            }
          }
          setFields(f);
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

  function updateField(key: string, val: string) {
    setFields((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      // Convert string values back to their original types
      const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(fields)) {
        const orig = user?.[k];
        // If original was a number, try to parse
        if (typeof orig === "number") {
          const n = Number(v);
          patch[k] = isNaN(n) ? v : n;
        }
        // If original was null/undefined and field is empty, keep null
        else if ((orig === null || orig === undefined) && v === "") {
          patch[k] = null;
        }
        // If it looks like JSON, try to parse
        else if (v.startsWith("{") || v.startsWith("[")) {
          try {
            patch[k] = JSON.parse(v);
          } catch {
            patch[k] = v;
          }
        }
        else {
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

  const fieldKeys = Object.keys(fields);

  return (
    <div className="usr-modal-overlay" onClick={onClose}>
      <div className="usr-modal usr-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="usr-modal-header">
          <span className="usr-modal-title">
            {loading ? "Завантаження…" : `Редагувати #${userId}`}
            {user?.username ? `  @${user.username}` : ""}
          </span>
          <button className="usr-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="usr-modal-body usr-card-body">
          {loading ? (
            <div className="usr-card-loading">Завантаження…</div>
          ) : error && !user ? (
            <div className="usr-card-error">Помилка: {error}</div>
          ) : (
            <div className="usr-edit-fields">
              {fieldKeys.map((key) => (
                <div className="usr-edit-row" key={key}>
                  <label className="usr-edit-label">{key}</label>
                  <input
                    className="usr-edit-input"
                    value={fields[key]}
                    onChange={(e) => updateField(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}
          {error && <div className="usr-card-error" style={{ marginTop: 8 }}>{error}</div>}
        </div>

        <div className="usr-modal-footer">
          <button className="btn btn--secondary btn--sm" onClick={onClose} disabled={saving}>
            Скасувати
          </button>
          <button className="btn btn--primary btn--sm" onClick={handleSave} disabled={saving || loading}>
            {saving ? "Збереження…" : "💾 Зберегти"}
          </button>
        </div>
      </div>
    </div>
  );
}
