import { useEffect, useState } from "react";
import { readUser, type UserRow } from "../../shared/api/users.api";

interface Props {
  userId: number;
  onClose: () => void;
  onEdit: (userId: number) => void;
  onMessage: (userId: number) => void;
}

/** Human-readable label for a field name */
function fieldLabel(key: string): string {
  const labels: Record<string, string> = {
    user_id: "ID",
    first_name: "Ім'я",
    last_name: "Прізвище",
    username: "Username",
    language: "Мова",
    created_at: "Створено",
    is_blocked: "Заблоковано",
    my_dates: "Мої дати",
    active_scenario: "Активний сценарій",
    message_id: "Останнє повідомлення",
    topics: "Теми",
    admin: "Адмін",
    galyashop: "Галяшоп",
    ttt: "TTT",
  };
  return labels[key] ?? key;
}

/** Render value cell: short strings as-is, JSON objects as collapsible */
function ValueCell({ val }: { val: unknown }) {
  if (val === null || val === undefined) {
    return <span className="usr-card-null">—</span>;
  }

  // Try to detect JSON objects/arrays
  if (typeof val === "string" && val.startsWith("{") || typeof val === "string" && val.startsWith("[")) {
    try {
      const parsed = JSON.parse(val);
      if (typeof parsed === "object" && parsed !== null) {
        return <JsonValue val={val} parsed={parsed} />;
      }
    } catch {
      // not valid JSON — show as text
    }
    return <span className="usr-card-text">{val}</span>;
  }

  if (typeof val === "object") {
    return <JsonValue val={JSON.stringify(val)} parsed={val} />;
  }

  return <span className="usr-card-text">{String(val)}</span>;
}

/** Collapsible JSON value */
function JsonValue({ val, parsed }: { val: string; parsed: unknown }) {
  const [expanded, setExpanded] = useState(false);

  // Compact: count keys or items
  let summary = "";
  if (Array.isArray(parsed)) {
    summary = `Масив [${parsed.length}]`;
  } else if (typeof parsed === "object" && parsed !== null) {
    const keys = Object.keys(parsed);
    summary = `Об'єкт {${keys.length}}`;
  }

  if (!expanded) {
    return (
      <div className="usr-card-json">
        <button className="usr-card-json-toggle" onClick={() => setExpanded(true)}>
          ▸ {summary}
        </button>
        <span className="usr-card-json-peek">{val.slice(0, 80)}{val.length > 80 ? "…" : ""}</span>
      </div>
    );
  }

  return (
    <div className="usr-card-json">
      <button className="usr-card-json-toggle" onClick={() => setExpanded(false)}>
        ▾ {summary}
      </button>
      <pre className="usr-card-json-full">{val}</pre>
    </div>
  );
}

export function UserCardModal({ userId, onClose, onEdit, onMessage }: Props) {
  const [user, setUser] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    readUser(userId)
      .then((data) => {
        if (!cancelled) {
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

  // Get all field keys, excluding user_id (shown in header)
  const fields = user != null ? Object.keys(user).filter((k) => k !== "user_id") : [];

  return (
    <div className="usr-modal-overlay" onClick={onClose}>
      <div className="usr-modal usr-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="usr-modal-header">
          <span className="usr-modal-title">
            {loading ? "Завантаження…" : error ? "Помилка" : `#${user?.user_id}`}
            {user?.username ? `  @${user.username}` : ""}
            {user?.first_name ? `  — ${[user.first_name, user.last_name].filter(Boolean).join(" ")}` : ""}
          </span>
          <button className="usr-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="usr-modal-body usr-card-body">
          {loading ? (
            <div className="usr-card-loading">Завантаження даних користувача…</div>
          ) : error ? (
            <div className="usr-card-error">Помилка: {error}</div>
          ) : !user ? (
            <div className="usr-card-error">Користувача не знайдено</div>
          ) : (
            <table className="usr-card-table">
              <thead>
                <tr>
                  <th className="usr-card-th-field">Поле</th>
                  <th className="usr-card-th-value">Значення</th>
                </tr>
              </thead>
              <tbody>
                {/* user_id — always first */}
                <tr>
                  <td className="usr-card-td-field">ID</td>
                  <td className="usr-card-td-value">
                    <span className="usr-card-text">{user.user_id}</span>
                  </td>
                </tr>
                {fields.map((key) => (
                  <tr key={key}>
                    <td className="usr-card-td-field">{fieldLabel(key)}</td>
                    <td className="usr-card-td-value">
                      <ValueCell val={user[key]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="usr-modal-footer">
          <button className="btn btn--secondary btn--sm" onClick={() => { onClose(); onMessage(userId); }}>
            ✉️ Написати
          </button>
          <button className="btn btn--primary btn--sm" onClick={() => { onClose(); onEdit(userId); }}>
            ✏️ Змінити
          </button>
        </div>
      </div>
    </div>
  );
}
