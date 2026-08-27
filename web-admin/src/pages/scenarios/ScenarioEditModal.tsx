import { useEffect, useState } from "react";
import { readScenarioAll, updateScenarioFields } from "../../shared/api/scenarios.api";

interface Props {
  codeword: string;
  onClose: () => void;
  onSaved: () => void;
}

export function ScenarioEditModal({ codeword, onClose, onSaved }: Props) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await readScenarioAll(codeword);
        if (!cancelled && row) {
          setData(row);
          // Convert all fields to strings for editing
          const f: Record<string, string> = {};
          for (const [key, value] of Object.entries(row)) {
            if (key === "codeword" || key === "created_at") continue; // protected
            if (value === null || value === undefined) {
              f[key] = "";
            } else if (typeof value === "object") {
              f[key] = JSON.stringify(value, null, 2);
            } else {
              f[key] = String(value);
            }
          }
          setFields(f);
          setLoading(false);
        } else if (!cancelled) {
          setError("Сценарій не знайдено");
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [codeword]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleChange = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Convert string values back to appropriate types
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (key === "updated_at") continue;
        if (value === "") {
          payload[key] = null;
        } else {
          // Try to parse JSON fields
          const trimmed = value.trim();
          if ((trimmed.startsWith("{") || trimmed.startsWith("[")) && (trimmed.endsWith("}") || trimmed.endsWith("]"))) {
            try {
              payload[key] = JSON.parse(trimmed);
              continue;
            } catch { /* not JSON, keep as string */ }
          }
          // Boolean fields
          if (trimmed === "true") { payload[key] = "true"; continue; }
          if (trimmed === "false") { payload[key] = "false"; continue; }
          // Number fields
          if (/^\d+$/.test(trimmed)) { payload[key] = parseInt(trimmed, 10); continue; }
          payload[key] = value;
        }
      }

      await updateScenarioFields(codeword, payload);
      setSuccess(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 800);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            ✏️ Редагування: {codeword}
          </h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ maxHeight: "60vh", overflow: "auto" }}>
          {loading ? (
            <div className="modal-loading">Завантаження…</div>
          ) : error && !data ? (
            <div className="modal-error">{error}</div>
          ) : (
            <div className="usr-edit-form">
              {Object.entries(fields).map(([key, value]) => {
                const isLarge = value.includes("\n") || value.length > 100;
                return (
                  <div className="usr-edit-row" key={key}>
                    <label className="usr-edit-label">{key}</label>
                    {isLarge ? (
                      <textarea
                        className="usr-edit-textarea"
                        value={value}
                        onChange={(e) => handleChange(key, e.target.value)}
                        rows={Math.min(Math.max(value.split("\n").length, 3), 15)}
                      />
                    ) : (
                      <input
                        className="usr-edit-input"
                        type="text"
                        value={value}
                        onChange={(e) => handleChange(key, e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {error && data && <div className="modal-error" style={{ marginTop: 8 }}>{error}</div>}
        </div>

        <div className="modal-footer">
          {success ? (
            <span className="usr-edit-success">✓ Збережено</span>
          ) : (
            <>
              <button
                className="btn btn--primary"
                onClick={handleSave}
                disabled={saving || loading}
              >
                {saving ? "Збереження…" : "💾 Зберегти"}
              </button>
              <button className="btn btn--secondary" onClick={onClose}>Скасувати</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
