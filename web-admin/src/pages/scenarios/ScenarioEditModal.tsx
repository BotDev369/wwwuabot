import { useEffect, useState, useCallback, useRef } from "react";
import {
  readScenarioAll,
  updateScenarioFields,
} from "../../shared/api/scenarios.api";

// ─── Field Groups (Tabs) ─────────────────────────────────────────────────────

type TabKey = "shared" | "bot" | "bot_rich" | "web";

interface TabDef {
  key: TabKey;
  label: string;
  icon: string;
  fields: string[];
  hasPreview: boolean;
}

const TABS: TabDef[] = [
  {
    key: "shared",
    label: "Спільне",
    icon: "⚙️",
    fields: ["codeword", "title", "created_at", "updated_at"],
    hasPreview: false,
  },
  {
    key: "bot",
    label: "Бот",
    icon: "🤖",
    fields: [
      "photo_url",
      "caption_top",
      "caption_mid",
      "caption_bot",
      "keyboard_type",
      "buttons",
      "awaits_input",
      "input_path",
      "input_next",
      "price",
      "qty_options",
    ],
    hasPreview: true,
  },
  {
    key: "bot_rich",
    label: "Бот-Річ",
    icon: "✨",
    fields: ["rich_message", "rich_data"],
    hasPreview: true,
  },
  {
    key: "web",
    label: "Веб",
    icon: "🌐",
    fields: ["page_data"],
    hasPreview: true,
  },
];

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  codeword: string;
  onClose: () => void;
  onSaved: () => void;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ScenarioEditModal({ codeword, onClose, onSaved }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("shared");
  const [allFields, setAllFields] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // JSON modal state
  const [jsonModalTab, setJsonModalTab] = useState<TabKey | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Load scenario ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await readScenarioAll(codeword);
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
    return () => {
      cancelled = true;
    };
  }, [codeword]);

  // ── Escape to close ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (jsonModalTab) {
          setJsonModalTab(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, jsonModalTab]);

  // ── Get fields for current tab ──
  const tabDef = TABS.find((t) => t.key === activeTab)!;
  const tabFields = tabDef.fields.filter((f) => f in allFields || activeTab !== "shared");
  const tabData: Record<string, unknown> = {};
  for (const f of tabDef.fields) {
    if (f in allFields) {
      tabData[f] = allFields[f];
    }
  }

  // ── Update a single field ──
  const handleFieldChange = useCallback(
    (key: string, value: unknown) => {
      setAllFields((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // ── Save all fields ──
  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      // Prepare only non-protected fields
      const payload: Record<string, unknown> = {};
      const PROTECTED = new Set(["codeword", "created_at"]);
      for (const [key, value] of Object.entries(allFields)) {
        if (PROTECTED.has(key)) continue;
        if (key === "updated_at") continue;
        payload[key] = value;
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
  }, [codeword, allFields, onSaved, onClose]);

  // ── JSON Export/Import ──
  const openJsonModal = useCallback(
    (tabKey: TabKey) => {
      const def = TABS.find((t) => t.key === tabKey)!;
      const data: Record<string, unknown> = {};
      for (const f of def.fields) {
        if (f in allFields) data[f] = allFields[f];
      }
      setJsonText(JSON.stringify(data, null, 2));
      setJsonError(null);
      setCopied(false);
      setJsonModalTab(tabKey);
    },
    [allFields],
  );

  const handleJsonCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      if (textareaRef.current) textareaRef.current.select();
    }
  }, [jsonText]);

  const handleJsonPaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setJsonText(text);
      setJsonError(null);
      try {
        JSON.parse(text);
      } catch {
        setJsonError("Невалідний JSON");
      }
    } catch {
      // clipboard unavailable
    }
  }, []);

  const handleJsonApply = useCallback(() => {
    if (!jsonModalTab) return;
    try {
      const parsed = JSON.parse(jsonText);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        setJsonError("JSON має бути об'єктом");
        return;
      }
      // Merge only fields that belong to this tab
      const def = TABS.find((t) => t.key === jsonModalTab)!;
      const updated = { ...allFields };
      for (const f of def.fields) {
        if (f in parsed) {
          updated[f] = parsed[f];
        }
      }
      setAllFields(updated);
      setJsonModalTab(null);
    } catch {
      setJsonError("Невалідний JSON");
    }
  }, [jsonModalTab, jsonText, allFields]);

  // ── Format JSON ──
  const handleJsonFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch {
      // don't format invalid JSON
    }
  }, [jsonText]);

  // ═══ RENDER ════════════════════════════════════════════════════════════════

  return (
    <div className="usr-modal-overlay" onClick={onClose}>
      <div
        className="usr-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 820, height: "85vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="usr-modal-header">
          <span className="usr-modal-title">✏️ {codeword}</span>
          <button className="usr-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="scn-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`scn-tab${activeTab === tab.key ? " scn-tab--active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="usr-modal-body" style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
          {loading ? (
            <div className="usr-modal-loading">Завантаження…</div>
          ) : error && Object.keys(allFields).length === 0 ? (
            <div className="usr-modal-error">{error}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              {/* Tab toolbar: JSON export/import */}
              <div className="scn-tab-toolbar">
                <button
                  className="btn btn--secondary"
                  onClick={() => openJsonModal(activeTab)}
                  style={{ fontSize: 12 }}
                >
                  🔧 JSON вкладки
                </button>
                <button
                  className="btn btn--secondary"
                  onClick={() => {
                    // Navigate to Page Builder for web tab
                    if (activeTab === "web") {
                      window.open(`/page-builder/${codeword}`, "_blank");
                    }
                  }}
                  style={{ fontSize: 12, display: activeTab === "web" ? "inline-flex" : "none" }}
                >
                  🏗️ Конструктор
                </button>
              </div>

              {/* Fields for current tab */}
              <div className="scn-tab-content">
                {activeTab === "shared" && (
                  <SharedFields
                    fields={allFields}
                    onChange={handleFieldChange}
                  />
                )}
                {activeTab === "bot" && (
                  <BotFields
                    fields={allFields}
                    onChange={handleFieldChange}
                  />
                )}
                {activeTab === "bot_rich" && (
                  <BotRichFields
                    fields={allFields}
                    onChange={handleFieldChange}
                  />
                )}
                {activeTab === "web" && (
                  <WebFields
                    fields={allFields}
                    onChange={handleFieldChange}
                  />
                )}
              </div>

              {/* Preview for Bot, Bot Rich, Web */}
              {tabDef.hasPreview && (
                <div className="scn-tab-preview">
                  <div className="scn-tab-preview-header">
                    <span className="scn-tab-preview-label">👁️ Превʼю</span>
                  </div>
                  <div className="scn-tab-preview-body">
                    {activeTab === "bot" && <BotPreview fields={allFields} />}
                    {activeTab === "bot_rich" && <BotRichPreview fields={allFields} />}
                    {activeTab === "web" && <WebPreview fields={allFields} codeword={codeword} />}
                  </div>
                </div>
              )}
            </div>
          )}
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

      {/* JSON Modal overlay */}
      {jsonModalTab && (
        <JsonTabModal
          tabKey={jsonModalTab}
          jsonText={jsonText}
          jsonError={jsonError}
          copied={copied}
          textareaRef={textareaRef}
          onChange={setJsonText}
          onCopy={handleJsonCopy}
          onPaste={handleJsonPaste}
          onFormat={handleJsonFormat}
          onApply={handleJsonApply}
          onClose={() => setJsonModalTab(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: Спільне (Shared)
// ═══════════════════════════════════════════════════════════════════════════════

function SharedFields({
  fields,
  onChange,
}: {
  fields: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <div className="scn-fields-grid">
      <FieldInput label="Codeword" value={fields.codeword} disabled />
      <FieldInput label="Назва" value={fields.title} onChange={(v) => onChange("title", v)} />
      <FieldInput label="Створено" value={fields.created_at} disabled />
      <FieldInput label="Оновлено" value={fields.updated_at} disabled />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: Бот (Bot)
// ═══════════════════════════════════════════════════════════════════════════════

function BotFields({
  fields,
  onChange,
}: {
  fields: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <div className="scn-fields-grid">
      <FieldInput
        label="Фото URL"
        value={fields.photo_url}
        onChange={(v) => onChange("photo_url", v)}
        placeholder="https://..."
      />
      <FieldInput
        label="Тип клавіатури"
        value={fields.keyboard_type}
        onChange={(v) => onChange("keyboard_type", v)}
        placeholder="inline / reply"
      />
      <FieldTextarea
        label="Текст зверху"
        value={fields.caption_top}
        onChange={(v) => onChange("caption_top", v)}
      />
      <FieldTextarea
        label="Текст посередині"
        value={fields.caption_mid}
        onChange={(v) => onChange("caption_mid", v)}
      />
      <FieldTextarea
        label="Текст знизу"
        value={fields.caption_bot}
        onChange={(v) => onChange("caption_bot", v)}
      />
      <FieldTextarea
        label="Кнопки (JSON)"
        value={fields.buttons}
        onChange={(v) => {
          // Try to parse, keep as string if invalid
          try {
            onChange("buttons", JSON.parse(v));
          } catch {
            onChange("buttons", v);
          }
        }}
        mono
      />
      <FieldInput
        label="Чекає ввід"
        value={fields.awaits_input}
        onChange={(v) => onChange("awaits_input", v)}
      />
      <FieldInput
        label="Шлях вводу"
        value={fields.input_path}
        onChange={(v) => onChange("input_path", v)}
      />
      <FieldInput
        label="Наступний крок"
        value={fields.input_next}
        onChange={(v) => onChange("input_next", v)}
      />
      <FieldInput
        label="Ціна"
        value={fields.price}
        onChange={(v) => onChange("price", v)}
      />
      <FieldInput
        label="Опції кількості"
        value={fields.qty_options}
        onChange={(v) => onChange("qty_options", v)}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: Бот-Річ (Bot Rich)
// ═══════════════════════════════════════════════════════════════════════════════

function BotRichFields({
  fields,
  onChange,
}: {
  fields: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <div className="scn-fields-grid">
      <FieldInput
        label="Rich Message"
        value={fields.rich_message}
        onChange={(v) => onChange("rich_message", v)}
        placeholder="true / false"
      />
      <FieldTextarea
        label="Rich Data (JSON блоки)"
        value={fields.rich_data}
        onChange={(v) => {
          try {
            onChange("rich_data", JSON.parse(v));
          } catch {
            onChange("rich_data", v);
          }
        }}
        mono
        rows={12}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: Веб (Web)
// ═══════════════════════════════════════════════════════════════════════════════

function WebFields({
  fields,
  onChange,
}: {
  fields: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <div className="scn-fields-grid">
      <FieldTextarea
        label="Page Data (JSON конфігурація сторінки)"
        value={fields.page_data}
        onChange={(v) => {
          try {
            onChange("page_data", JSON.parse(v));
          } catch {
            onChange("page_data", v);
          }
        }}
        mono
        rows={16}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREVIEW: Bot
// ═══════════════════════════════════════════════════════════════════════════════

function BotPreview({ fields }: { fields: Record<string, unknown> }) {
  const photoUrl = String(fields.photo_url || "");
  const captionTop = String(fields.caption_top || "");
  const captionMid = String(fields.caption_mid || "");
  const captionBot = String(fields.caption_bot || "");
  const caption = [captionTop, captionMid, captionBot].filter(Boolean).join("\n───────\n");

  let buttons: string[][] = [];
  try {
    const raw = fields.buttons;
    buttons = typeof raw === "string" ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
  } catch {
    // ignore
  }

  return (
    <div className="tg-message" style={{ maxWidth: 340 }}>
      {photoUrl && (
        <img
          src={photoUrl}
          alt=""
          className="tg-photo"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      {caption ? (
        <div className="tg-caption">{caption}</div>
      ) : (
        <div className="tg-message-placeholder">Порожнє повідомлення</div>
      )}
      {buttons.length > 0 && (
        <div className="tg-buttons">
          {buttons.map((row, i) => (
            <div key={i} className="tg-btn-row">
              {row.map((btn, j) => (
                <span key={j} className="tg-btn">
                  {typeof btn === "string" ? btn : btn.text || "?"}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREVIEW: Bot Rich
// ═══════════════════════════════════════════════════════════════════════════════

function BotRichPreview({ fields }: { fields: Record<string, unknown> }) {
  let richData: unknown[] = [];
  try {
    const raw = fields.rich_data;
    richData = typeof raw === "string" ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
  } catch {
    // ignore
  }

  if (richData.length === 0) {
    return (
      <div className="tg-message" style={{ maxWidth: 340 }}>
        <div className="tg-placeholder">Rich Data порожній</div>
      </div>
    );
  }

  return (
    <div className="tg-message" style={{ maxWidth: 340 }}>
      {richData.map((block: unknown, i: number) => {
        const b = block as Record<string, unknown>;
        const type = String(b.type || "");
        if (type === "heading") {
          const level = Number(b.level) || 2;
          const text = String(b.text || "");
          return (
            <div key={i} className={`tg-heading tg-heading--h${level}`}>
              {text}
            </div>
          );
        }
        if (type === "paragraph") {
          return (
            <div key={i} className="tg-paragraph">
              {String(b.text || "")}
            </div>
          );
        }
        if (type === "divider") {
          return <hr key={i} className="tg-divider" />;
        }
        if (type === "photo") {
          return (
            <img
              key={i}
              src={String(b.url || b.photo_url || "")}
              alt=""
              className="tg-photo-block"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          );
        }
        // Unknown block type
        return (
          <div key={i} className="tg-unknown">
            [{type || "unknown"}]
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREVIEW: Web
// ═══════════════════════════════════════════════════════════════════════════════

function WebPreview({
  fields,
  codeword,
}: {
  fields: Record<string, unknown>;
  codeword: string;
}) {
  let pageData: Record<string, unknown> | null = null;
  try {
    const raw = fields.page_data;
    pageData =
      typeof raw === "string"
        ? JSON.parse(raw)
        : typeof raw === "object" && raw !== null
          ? (raw as Record<string, unknown>)
          : null;
  } catch {
    // ignore
  }

  if (!pageData) {
    return (
      <div style={{ padding: 16, textAlign: "center", color: "var(--text-muted)" }}>
        page_data порожній або невалідний
      </div>
    );
  }

  const zones = (pageData as { zones?: Record<string, unknown[]> }).zones || {};
  const zoneNames = ["sidebar", "header", "main", "footer"];
  const totalBlocks = zoneNames.reduce(
    (sum, z) => sum + ((zones as Record<string, unknown[]>)[z]?.length || 0),
    0,
  );

  return (
    <div style={{ padding: 12, fontSize: 13 }}>
      <div style={{ marginBottom: 8, fontWeight: 600, color: "var(--text-primary)" }}>
        📄 Сторінка: /{codeword}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
        Версія: {(pageData as { version?: number }).version ?? "?"} • Блоків: {totalBlocks}
      </div>
      {zoneNames.map((z) => {
        const blocks = (zones as Record<string, unknown[]>)[z] || [];
        if (blocks.length === 0) return null;
        return (
          <div key={z} style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>
              {z}:
            </span>{" "}
            <span style={{ fontSize: 12 }}>
              {blocks.map((b: unknown) => (b as Record<string, unknown>).type).join(", ")}
            </span>
          </div>
        );
      })}
      <div style={{ marginTop: 12 }}>
        <a
          href={`/page-builder/${codeword}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: "var(--accent)" }}
        >
          🏗️ Відкрити конструктор →
        </a>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// JSON Tab Modal
// ═══════════════════════════════════════════════════════════════════════════════

function JsonTabModal({
  tabKey,
  jsonText,
  jsonError,
  copied,
  textareaRef,
  onChange,
  onCopy,
  onPaste,
  onFormat,
  onApply,
  onClose,
}: {
  tabKey: TabKey;
  jsonText: string;
  jsonError: string | null;
  copied: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onChange: (v: string) => void;
  onCopy: () => void;
  onPaste: () => void;
  onFormat: () => void;
  onApply: () => void;
  onClose: () => void;
}) {
  const tab = TABS.find((t) => t.key === tabKey)!;

  return (
    <div className="usr-modal-overlay" style={{ zIndex: 1000 }} onClick={onClose}>
      <div
        className="usr-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 700, position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)" }}
      >
        <div className="usr-modal-header">
          <span className="usr-modal-title">
            {tab.icon} JSON: {tab.label}
          </span>
          <button className="usr-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="usr-modal-body" style={{ padding: 0 }}>
          {/* Toolbar */}
          <div style={{ display: "flex", gap: 6, padding: "8px 12px", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
            <button className="btn btn--secondary" onClick={onCopy} style={{ fontSize: 12, padding: "4px 10px" }}>
              {copied ? "✓ Скопійовано" : "📋 Копіювати"}
            </button>
            <button className="btn btn--secondary" onClick={onPaste} style={{ fontSize: 12, padding: "4px 10px" }}>
              📥 Вставити з буферу
            </button>
            <button className="btn btn--secondary" onClick={onFormat} style={{ fontSize: 12, padding: "4px 10px" }}>
              ✨ Форматувати
            </button>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={jsonText}
            onChange={(e) => {
              onChange(e.target.value);
            }}
            spellCheck={false}
            style={{
              width: "100%",
              minHeight: 300,
              padding: "12px 16px",
              border: "none",
              outline: "none",
              resize: "vertical",
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

        <div className="usr-modal-footer">
          <button className="btn btn--primary" onClick={onApply} disabled={!!jsonError || !jsonText.trim()}>
            ✅ Застосувати
          </button>
          <button className="btn btn--secondary" onClick={onClose}>
            Скасувати
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Shared Form Fields
// ═══════════════════════════════════════════════════════════════════════════════

function FieldInput({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: unknown;
  onChange?: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const strValue = value === null || value === undefined ? "" : String(value);
  return (
    <div className="scn-field">
      <label className="scn-field-label">{label}</label>
      <input
        type="text"
        className={`usr-edit-input${disabled ? " usr-edit-input--disabled" : ""}`}
        value={strValue}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        disabled={disabled}
        placeholder={placeholder}
        readOnly={disabled}
      />
    </div>
  );
}

function FieldTextarea({
  label,
  value,
  onChange,
  mono,
  rows = 5,
}: {
  label: string;
  value: unknown;
  onChange: (v: string) => void;
  mono?: boolean;
  rows?: number;
}) {
  const strValue = value === null || value === undefined ? "" :
    typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);

  return (
    <div className="scn-field scn-field--full">
      <label className="scn-field-label">{label}</label>
      <textarea
        className="usr-edit-textarea"
        value={strValue}
        onChange={(e) => onChange(e.target.value)}
        rows={Math.min(Math.max(strValue.split("\n").length, rows), 20)}
        style={mono ? { fontFamily: "monospace", fontSize: 12 } : undefined}
      />
    </div>
  );
}
