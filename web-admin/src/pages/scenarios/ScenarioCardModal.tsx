/**
 * ScenarioCardModal — єдиний модальний блок редагування сценарію.
 *
 * Головні вкладки:  Веб (замовч.), Бот-Річ+Кнопки, Бот+Кнопки, Спільне
 * Підвкладки:       Прев'ю (замовч.), JSON вкладки, Конструктор
 *
 * Працює з будь-якою таблицею (admin / portal) через ScenarioTable.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  readScenarioAll,
  updateScenarioFields,
  type ScenarioTable,
} from "../../shared/api/scenarios.api";

// ─── Types ────────────────────────────────────────────────────────

type MainTab = "web" | "bot_rich" | "bot" | "shared";
type SubTab = "preview" | "json" | "constructor";

interface MainTabDef {
  key: MainTab;
  label: string;
  icon: string;
}

const MAIN_TABS: MainTabDef[] = [
  { key: "web", label: "Веб", icon: "🌐" },
  { key: "bot_rich", label: "Бот-Річ + Кнопки", icon: "✨" },
  { key: "bot", label: "Бот + Кнопки", icon: "🤖" },
  { key: "shared", label: "Спільне", icon: "⚙️" },
];

const SUB_TABS: { key: SubTab; label: string; icon: string }[] = [
  { key: "preview", label: "Превʼю", icon: "👁️" },
  { key: "json", label: "JSON", icon: "🔧" },
  { key: "constructor", label: "Конструктор", icon: "🏗️" },
];

// ─── Props ────────────────────────────────────────────────────────

interface Props {
  codeword: string;
  table: ScenarioTable;
  onClose: () => void;
  onSaved: () => void;
}

// ─── Main Component ───────────────────────────────────────────────

export function ScenarioCardModal({ codeword, table, onClose, onSaved }: Props) {
  const [mainTab, setMainTab] = useState<MainTab>("web");
  const [subTab, setSubTab] = useState<SubTab>("preview");
  const [allFields, setAllFields] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // JSON editor state
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Load scenario ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await readScenarioAll(codeword, table);
        if (!cancelled && row) {
          setAllFields(row);
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
  }, [codeword, table]);

  // ── Escape to close ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // ── Save ──
  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const PROTECTED = new Set(["codeword", "created_at"]);
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(allFields)) {
        if (PROTECTED.has(key)) continue;
        if (key === "updated_at") continue;
        payload[key] = value;
      }
      await updateScenarioFields(codeword, payload, table);
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
  }, [codeword, allFields, table, onSaved, onClose]);

  // ── JSON helpers ──
  const openJsonTab = useCallback(() => {
    // Export current tab's fields as JSON
    const tabFields = getFieldsForTab(mainTab, allFields);
    setJsonText(JSON.stringify(tabFields, null, 2));
    setJsonError(null);
    setCopied(false);
    setSubTab("json");
  }, [mainTab, allFields]);

  const handleJsonCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      if (textareaRef.current) textareaRef.current.select();
    }
  }, [jsonText]);

  const handleJsonFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch { /* ignore */ }
  }, [jsonText]);

  const handleJsonApply = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        setJsonError("JSON має бути об'єктом");
        return;
      }
      // Merge only fields that belong to the current tab
      const tabFields = getFieldsForTab(mainTab, allFields);
      const updated = { ...allFields };
      for (const key of Object.keys(tabFields)) {
        if (key in parsed) {
          updated[key] = parsed[key];
        }
      }
      setAllFields(updated);
      setSubTab("preview");
    } catch {
      setJsonError("Невалідний JSON");
    }
  }, [jsonText, mainTab, allFields]);

  const handleJsonChange = useCallback((value: string) => {
    setJsonText(value);
    setJsonError(null);
    try {
      JSON.parse(value);
    } catch {
      setJsonError("Невалідний JSON");
    }
  }, []);

  // ── Open Page Builder / Constructor ──
  const handleOpenConstructor = useCallback(() => {
    window.open(`/page-builder/${codeword}`, "_blank");
  }, [codeword]);

  // ── When switching to JSON sub-tab, auto-populate ──
  useEffect(() => {
    if (subTab === "json") {
      const tabFields = getFieldsForTab(mainTab, allFields);
      setJsonText(JSON.stringify(tabFields, null, 2));
      setJsonError(null);
    }
  }, [subTab, mainTab, allFields]);

  // ═══ RENDER ════════════════════════════════════════════════════════

  return (
    <div className="usr-modal-overlay" onClick={onClose}>
      <div
        className="usr-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 900, height: "90vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="usr-modal-header">
          <span className="usr-modal-title">📋 {codeword}</span>
          <button className="usr-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Main Tabs */}
        <div className="scn-tabs">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.key}
              className={`scn-tab${mainTab === tab.key ? " scn-tab--active" : ""}`}
              onClick={() => { setMainTab(tab.key); setSubTab("preview"); }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Sub-tabs */}
        <div className="scn-subtabs">
          {SUB_TABS.map((st) => (
            <button
              key={st.key}
              className={`scn-subtab${subTab === st.key ? " scn-subtab--active" : ""}`}
              onClick={() => {
                if (st.key === "json") {
                  openJsonTab();
                } else if (st.key === "constructor") {
                  handleOpenConstructor();
                } else {
                  setSubTab(st.key);
                }
              }}
            >
              <span>{st.icon}</span>
              <span>{st.label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="usr-modal-body" style={{ flex: 1, overflow: "auto" }}>
          {loading ? (
            <div className="usr-modal-loading">Завантаження…</div>
          ) : error && Object.keys(allFields).length === 0 ? (
            <div className="usr-modal-error">{error}</div>
          ) : subTab === "preview" ? (
            <TabPreview mainTab={mainTab} fields={allFields} codeword={codeword} />
          ) : subTab === "json" ? (
            <JsonEditor
              jsonText={jsonText}
              jsonError={jsonError}
              copied={copied}
              textareaRef={textareaRef}
              onChange={handleJsonChange}
              onCopy={handleJsonCopy}
              onFormat={handleJsonFormat}
              onApply={handleJsonApply}
            />
          ) : null}

          {error && Object.keys(allFields).length > 0 && (
            <div className="usr-modal-error" style={{ marginTop: 8 }}>{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="usr-modal-footer">
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
              <button className="btn btn--secondary" onClick={onClose}>
                Скасувати
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab Fields Helper ────────────────────────────────────────────

function getFieldsForTab(tab: MainTab, allFields: Record<string, unknown>): Record<string, unknown> {
  const FIELD_MAP: Record<MainTab, string[]> = {
    web: ["page_data"],
    bot_rich: ["rich_message", "rich_data"],
    bot: [
      "photo_url", "caption_top", "caption_mid", "caption_bot",
      "keyboard_type", "buttons", "awaits_input", "input_path",
      "input_next", "price", "qty_options",
    ],
    shared: ["codeword", "title", "created_at", "updated_at"],
  };
  const result: Record<string, unknown> = {};
  for (const key of FIELD_MAP[tab]) {
    if (key in allFields) result[key] = allFields[key];
  }
  return result;
}

// ─── Preview per Tab ──────────────────────────────────────────────

function TabPreview({
  mainTab,
  fields,
  codeword,
}: {
  mainTab: MainTab;
  fields: Record<string, unknown>;
  codeword: string;
}) {
  if (mainTab === "web") return <WebPreview fields={fields} codeword={codeword} />;
  if (mainTab === "bot_rich") return <BotRichPreview fields={fields} />;
  if (mainTab === "bot") return <BotPreview fields={fields} />;
  return <SharedPreview fields={fields} />;
}

// ─── Web Preview ──────────────────────────────────────────────────

function WebPreview({ fields, codeword }: { fields: Record<string, unknown>; codeword: string }) {
  let pageData: Record<string, unknown> | null = null;
  try {
    const raw = fields.page_data;
    pageData = typeof raw === "string" ? JSON.parse(raw) : typeof raw === "object" && raw !== null ? raw as Record<string, unknown> : null;
  } catch { /* ignore */ }

  if (!pageData) {
    return <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>page_data порожній або невалідний</div>;
  }

  const zones = (pageData as { zones?: Record<string, unknown[]> }).zones || {};
  const zoneNames = ["sidebar", "header", "main", "footer"];
  const totalBlocks = zoneNames.reduce((sum, z) => sum + ((zones as Record<string, unknown[]>)[z]?.length || 0), 0);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 14 }}>📄 Сторінка: /{codeword}</div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
        Версія: {(pageData as { version?: number }).version ?? "?"} • Блоків: {totalBlocks}
      </div>
      {zoneNames.map((z) => {
        const blocks = (zones as Record<string, unknown[]>)[z] || [];
        if (blocks.length === 0) return null;
        return (
          <div key={z} style={{ marginBottom: 8, padding: "8px 12px", background: "var(--bg-2)", borderRadius: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>{z}</div>
            <div style={{ fontSize: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {blocks.map((b, i) => (
                <span key={i} className="scn-badge">{(b as Record<string, unknown>).type as string}</span>
              ))}
            </div>
          </div>
        );
      })}
      <div style={{ marginTop: 16 }}>
        <a href={`/page-builder/${codeword}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--accent)" }}>
          🏗️ Відкрити конструктор →
        </a>
      </div>
    </div>
  );
}

// ─── Bot Rich Preview ─────────────────────────────────────────────

function BotRichPreview({ fields }: { fields: Record<string, unknown> }) {
  let richData: unknown[] = [];
  try {
    const raw = fields.rich_data;
    richData = typeof raw === "string" ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
  } catch { /* ignore */ }

  if (richData.length === 0) {
    return <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>Rich Data порожній</div>;
  }

  return (
    <div className="tg-message" style={{ maxWidth: 380, margin: "0 auto" }}>
      {richData.map((block, i) => <RichBlock key={i} block={block as Record<string, unknown>} />)}
    </div>
  );
}

// ─── Rich Block Renderer ──────────────────────────────────────────

function RichBlock({ block }: { block: Record<string, unknown> }) {
  const type = String(block.type || "");

  if (type === "heading") {
    const level = Number(block.level) || 2;
    return <div className={`tg-heading tg-heading--h${level}`}>{String(block.text || "")}</div>;
  }
  if (type === "paragraph") {
    return <div className="tg-paragraph">{String(block.text || "")}</div>;
  }
  if (type === "divider") {
    return <hr className="tg-divider" />;
  }
  if (type === "photo") {
    return <img src={String(block.url || block.photo_url || "")} alt="" className="tg-photo" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />;
  }
  if (type === "list") {
    const items = Array.isArray(block.items) ? block.items : [];
    return (
      <ul className="tg-list">
        {items.map((item: unknown, i: number) => (
          <li key={i}>{typeof item === "string" ? item : JSON.stringify(item)}</li>
        ))}
      </ul>
    );
  }
  if (type === "blockquote") {
    const text = String(block.text || "");
    const children = Array.isArray(block.children) ? block.children : [];
    return (
      <div className="tg-blockquote">
        {text && <div className="tg-paragraph">{text}</div>}
        {children.map((child: unknown, i: number) => (
          <div key={i} style={{ marginTop: 4, fontSize: 13, color: "var(--text-muted)" }}>{typeof child === "string" ? child : JSON.stringify(child)}</div>
        ))}
      </div>
    );
  }
  if (type === "details") {
    const summary = String(block.summary || "Деталі");
    const children = Array.isArray(block.children) ? block.children : [];
    return (
      <div className="tg-details">
        <div className="tg-details-summary">{summary}</div>
        <div className="tg-details-body">
          {children.map((child: unknown, i: number) => (
            <div key={i} style={{ marginTop: 4, fontSize: 13 }}>{typeof child === "string" ? child : JSON.stringify(child)}</div>
          ))}
        </div>
      </div>
    );
  }
  if (type === "footer") {
    return <div className="tg-footer">{String(block.text || "")}</div>;
  }
  if (type === "slideshow") {
    return (
      <div style={{ padding: "6px 10px", background: "var(--bg-2)", borderRadius: 6, fontSize: 12, color: "var(--text-muted)", border: "1px dashed var(--border)", textAlign: "center" }}>
        📸 Слайдшоу
      </div>
    );
  }
  // Unknown — show type name
  return (
    <div className="tg-unknown">
      [{type || "unknown"}]
    </div>
  );
}

// ─── Bot Preview ──────────────────────────────────────────────────

function BotPreview({ fields }: { fields: Record<string, unknown> }) {
  const photoUrl = String(fields.photo_url || "");
  const caption = [fields.caption_top, fields.caption_mid, fields.caption_bot]
    .filter(Boolean).join("\n───────\n");

  let buttons: unknown[][] = [];
  try {
    const raw = fields.buttons;
    buttons = typeof raw === "string" ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
  } catch { /* ignore */ }

  return (
    <div className="tg-message" style={{ maxWidth: 380, margin: "0 auto" }}>
      {photoUrl && <img src={photoUrl} alt="" className="tg-photo" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
      {caption ? <div className="tg-caption">{caption}</div> : <div className="tg-message-placeholder">Порожнє повідомлення</div>}
      {buttons.length > 0 && (
        <div className="tg-buttons">
          {buttons.map((row, i) => (
            <div key={i} className="tg-btn-row">
              {row.map((btn, j) => (
                <span key={j} className="tg-btn">{typeof btn === "string" ? btn : (btn as { text?: string }).text || "?"}</span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared Preview ───────────────────────────────────────────────

function SharedPreview({ fields }: { fields: Record<string, unknown> }) {
  return (
    <div style={{ padding: 16 }}>
      <table className="usr-card-table" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th className="usr-card-th-field">Поле</th>
            <th className="usr-card-th-value">Значення</th>
          </tr>
        </thead>
        <tbody>
          {["codeword", "title", "created_at", "updated_at"].map((key) => (
            <tr key={key}>
              <td className="usr-card-td-field">{key}</td>
              <td className="usr-card-td-value" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                {fields[key] === null || fields[key] === undefined ? "—" : String(fields[key])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── JSON Editor ──────────────────────────────────────────────────

function JsonEditor({
  jsonText,
  jsonError,
  copied,
  textareaRef,
  onChange,
  onCopy,
  onFormat,
  onApply,
}: {
  jsonText: string;
  jsonError: string | null;
  copied: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (v: string) => void;
  onCopy: () => void;
  onFormat: () => void;
  onApply: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 6, padding: "8px 12px", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
        <button className="btn btn--secondary" onClick={onCopy} style={{ fontSize: 12, padding: "4px 10px" }}>
          {copied ? "✓ Скопійовано" : "📋 Копіювати"}
        </button>
        <button className="btn btn--secondary" onClick={onFormat} style={{ fontSize: 12, padding: "4px 10px" }}>
          ✨ Форматувати
        </button>
        <button className="btn btn--primary" onClick={onApply} disabled={!!jsonError || !jsonText.trim()} style={{ fontSize: 12, padding: "4px 10px" }}>
          ✅ Застосувати
        </button>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={jsonText}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        style={{
          flex: 1,
          width: "100%",
          minHeight: 300,
          padding: "12px 16px",
          border: "none",
          outline: "none",
          resize: "none",
          fontFamily: "monospace",
          fontSize: 13,
          lineHeight: 1.5,
          background: "var(--bg-secondary, #1e1e1e)",
          color: "var(--text-primary, #d4d4d4)",
          tabSize: 2,
        }}
      />

      {/* Status */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px", borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--text-secondary)" }}>
        <div>
          {jsonError ? (
            <span style={{ color: "var(--color-error, #ef4444)" }}>⚠️ {jsonError}</span>
          ) : jsonText.trim() ? (
            <span style={{ color: "var(--color-success, #22c55e)" }}>✓ Валідний JSON</span>
          ) : null}
        </div>
        <div>{jsonText.length.toLocaleString()} символів</div>
      </div>
    </div>
  );
}
