import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { readScenario, saveScenarioFields, deleteScenario } from "../../shared/api/scenarios.api";
import { PageTopbar } from "../../layout/PageTopbar";
import { ButtonsField } from "../../features/scenarios/keyboard/ButtonsField";
import { validateButtons } from "../../features/scenarios/keyboard/keyboard.utils";

interface FieldDef {
  key: string;
  label: string;
  kind: "input" | "textarea";
  hint?: string;
}

const FIELD_DEFS: FieldDef[] = [
  {
    key: "photo_url",
    label: "photo_url",
    kind: "input",
    hint: "https://… (порожньо = Cloudinary-банер)",
  },
  { key: "caption_top", label: "caption_top", kind: "textarea" },
  { key: "caption_mid", label: "caption_mid", kind: "textarea" },
  { key: "caption_bot", label: "caption_bot", kind: "textarea" },
  { key: "buttons", label: "buttons (клавіатура)", kind: "textarea" },
  { key: "price", label: "price", kind: "input", hint: "число або порожньо" },
  { key: "qty_options", label: "qty_options", kind: "input", hint: "1, 2, 3" },
  { key: "keyboard_type", label: "keyboard_type", kind: "input", hint: "static" },
  { key: "awaits_input", label: "awaits_input", kind: "input", hint: "text або порожньо" },
  { key: "input_path", label: "input_path", kind: "input" },
  { key: "input_next", label: "input_next", kind: "input" },
  { key: "notify_groups", label: "notify_groups", kind: "input", hint: "group_a, group_b" },
  { key: "notify_template", label: "notify_template", kind: "textarea" },
];

const CREATE_DEFAULTS: Record<string, string> = {
  keyboard_type: "static",
  buttons: "[]",
};

export function ScenarioFormPage() {
  const { codeword } = useParams();
  const isEdit = Boolean(codeword);
  const navigate = useNavigate();

  const [form, setForm] = useState<Record<string, string>>({});
  const [cw, setCw] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("ready");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isEdit) {
      setForm({ ...CREATE_DEFAULTS });
      setState("ready");
      return;
    }
    let cancelled = false;
    setState("loading");
    readScenario(codeword!)
      .then((row) => {
        if (cancelled) return;
        if (!row) {
          setState("error");
          setErrorMsg("Сценарій не знайдено");
          return;
        }
        const next: Record<string, string> = {};
        for (const def of FIELD_DEFS) {
          const v = (row as unknown as Record<string, unknown>)[def.key];
          next[def.key] = v === null || v === undefined ? "" : String(v);
        }
        setForm(next);
        setState("ready");
      })
      .catch((e) => {
        if (!cancelled) {
          setState("error");
          setErrorMsg((e as Error).message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [codeword, isEdit]);

  function setField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    const targetCw = (isEdit ? (codeword ?? "") : cw).trim();
    if (!targetCw) {
      setErrorMsg("Вкажіть codeword");
      return;
    }
    const buttonsRaw = (form.buttons ?? "").trim();
    if (buttonsRaw) {
      const err = validateButtons(buttonsRaw);
      if (err) {
        setErrorMsg(`buttons: ${err}`);
        return;
      }
    }
    setSaving(true);
    setErrorMsg(null);
    setSaved(false);
    try {
      const fields: Record<string, unknown> = {};
      for (const def of FIELD_DEFS) fields[def.key] = form[def.key] ?? "";
      await saveScenarioFields(targetCw, fields);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (!isEdit) {
        navigate(`/scenarios/${encodeURIComponent(targetCw)}/edit`, { replace: true });
      }
    } catch (e) {
      setErrorMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!codeword) return;
    if (!window.confirm(`Видалити сценарій «${codeword}» назавжди?`)) return;
    setSaving(true);
    try {
      await deleteScenario(codeword);
      navigate("/scenarios");
    } catch (e) {
      setErrorMsg((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <>
      <PageTopbar>
        <div className="topbar-left">
          <button
            className="btn btn--secondary"
            onClick={() =>
              navigate(isEdit ? `/scenarios/${encodeURIComponent(codeword!)}` : "/scenarios")
            }
            title="Назад"
          >
            ←
          </button>
          <h1 className="topbar-title scn-preview-title">{isEdit ? codeword : "Новий сценарій"}</h1>
          {saved && <span className="status-badge status-badge--saved">✓ Збережено</span>}
        </div>
        <div className="topbar-right">
          {isEdit && (
            <button className="btn btn--danger" onClick={handleDelete} disabled={saving}>
              Видалити
            </button>
          )}
          <button
            className="btn btn--primary"
            onClick={handleSave}
            disabled={saving || state === "loading"}
          >
            {saving ? "Збереження…" : "Зберегти"}
          </button>
        </div>
      </PageTopbar>

      <div className="scn-form">
        {state === "loading" ? (
          <div className="empty-state">
            <p className="empty-state-text">Завантаження…</p>
          </div>
        ) : state === "error" ? (
          <div className="empty-state">
            <p className="empty-state-text">Помилка: {errorMsg}</p>
          </div>
        ) : (
          <div className="scn-form-inner">
            {!isEdit && (
              <div className="scn-field">
                <label className="scn-field-label">codeword (новий)</label>
                <input
                  className="block-input"
                  value={cw}
                  onChange={(e) => setCw(e.target.value)}
                  placeholder="напр. galyashop_new"
                />
              </div>
            )}
            {errorMsg && <p className="login-error">{errorMsg}</p>}
            <div className="scn-form-grid">
              {FIELD_DEFS.map((def) => (
                <div
                  key={def.key}
                  className={`scn-field${def.kind === "textarea" ? " scn-field--full" : ""}`}
                >
                  <label className="scn-field-label">{def.label}</label>
                  {def.key === "buttons" ? (
                    <ButtonsField
                      value={form.buttons ?? ""}
                      onChange={(v) => setField("buttons", v)}
                    />
                  ) : def.kind === "textarea" ? (
                    <textarea
                      className="block-textarea"
                      rows={3}
                      value={form[def.key] ?? ""}
                      onChange={(e) => setField(def.key, e.target.value)}
                      placeholder={def.hint ?? ""}
                    />
                  ) : (
                    <input
                      className="block-input"
                      value={form[def.key] ?? ""}
                      onChange={(e) => setField(def.key, e.target.value)}
                      placeholder={def.hint ?? ""}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
