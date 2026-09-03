/**
 * ScenarioCardModal — єдиний модальний блок редагування сценарію.
 *
 * Головні вкладки:  Веб (замовч.), Бот-Річ+Кнопки, Бот+Кнопки, Спільне
 * Підвкладки:       Прев'ю (замовч.), JSON, Конструктор
 *
 * Конструктор для Бот+Кнопки — вбудований ButtonsField (візуальний редактор кнопок)
 * Конструктор для Бот-Річ — вбудований rich blocks editor
 * Конструктор для Веб — посилання на Page Builder (окрема сторінка)
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  readScenarioAll,
  updateScenarioFields,
  type ScenarioTable,
} from "../../shared/api/scenarios.api";
import { PageRenderer } from "@wwwuabot/ui";
import type { PageConfig, BlockContext } from "@wwwuabot/shared/types/page-config";
import { parsePageConfig } from "@wwwuabot/shared/types/page-config";
import { registerAllBlocks } from "@wwwuabot/ui/blocks";
import { ButtonsField } from "../../features/scenarios/keyboard/ButtonsField";
import { PageBuilderInline } from "../../features/page-builder/PageBuilderInline";
import type { PageConfig as PageConfigType } from "@wwwuabot/shared/types/page-config";
import { createEmptyPageConfig } from "@wwwuabot/shared/types/page-config";
import { icons, type IconName } from "@wwwuabot/shared";

const ico = (name: IconName, size = 16) => (
  <span style={{ display: "inline-flex", alignItems: "center", width: size, height: size, flexShrink: 0 }}>
    {icons[name]}
  </span>
);

// Реєструємо блоки один раз при завантаженні модуля
registerAllBlocks();

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

// Icon mapping for main tabs (SVG instead of emoji)
const MAIN_TAB_ICONS: Record<MainTab, IconName> = {
  web: "globe",
  bot_rich: "sparkles",
  bot: "bot",
  shared: "settings",
};

const SUB_TAB_ICONS: Record<SubTab, IconName> = {
  preview: "eye",
  json: "wrench",
  constructor: "construction",
};

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "preview", label: "Превʼю" },
  { key: "json", label: "JSON" },
  { key: "constructor", label: "Конструктор" },
];

// ─── Props ────────────────────────────────────────────────────────

interface Props {
  codeword: string;
  table: ScenarioTable;
  onClose: () => void;
  onSaved: () => void;
  /** Початкова підвкладка (наприклад, 'constructor' для відкриття конструктора одразу) */
  initialSubTab?: SubTab;
}

// ─── Main Component ───────────────────────────────────────────────

export function ScenarioCardModal({ codeword, table, onClose, onSaved, initialSubTab }: Props) {
  const [mainTab, setMainTab] = useState<MainTab>("web");
  const [subTab, setSubTab] = useState<SubTab>(initialSubTab ?? "preview");
  const [allFields, setAllFields] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fullscreenBuilder, setFullscreenBuilder] = useState(false);

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

  // ── Update a single field ──
  const updateField = useCallback((key: string, value: unknown) => {
    setAllFields((prev) => ({ ...prev, [key]: value }));
  }, []);

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
    <div className="wb-modal-overlay" onClick={onClose}>
      <div
        className="wb-modal scn-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 900, width: "100%", height: "90vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="wb-modal-header">
          <span className="wb-modal-title">{ico("clipboard")} {codeword}</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <a
              href={`/${codeword}`}
              target="_blank"
              rel="noopener noreferrer"
              className="wb-btn wb-btn-secondary"
              style={{ fontSize: 12, padding: "4px 10px", textDecoration: "none" }}
            >
              {ico("link")} Перейти
            </a>
            <button className="wb-close-btn" onClick={onClose}>{icons["close"]}</button>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="scn-tabs">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.key}
              className={`scn-tab${mainTab === tab.key ? " scn-tab--active" : ""}`}
              onClick={() => { setMainTab(tab.key); setSubTab("preview"); }}
              title={tab.label}
            >
              {ico(MAIN_TAB_ICONS[tab.key], 20)}
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
                } else {
                  setSubTab(st.key);
                }
              }}
              title={st.label}
            >
              {ico(SUB_TAB_ICONS[st.key], 18)}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="wb-modal-body" style={{ flex: 1, overflow: "auto" }}>
          {loading ? (
            <div className="wb-modal-loading">Завантаження…</div>
          ) : error && Object.keys(allFields).length === 0 ? (
            <div className="wb-modal-error">{error}</div>
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
          ) : subTab === "constructor" ? (
            <TabConstructor
              mainTab={mainTab}
              fields={allFields}
              updateField={updateField}
              codeword={codeword}
              onFullscreen={() => setFullscreenBuilder(true)}
            />
          ) : null}

          {error && Object.keys(allFields).length > 0 && (
            <div className="wb-modal-error" style={{ marginTop: 8 }}>{error}</div>
          )}
        </div>

        {/* Fullscreen Page Builder overlay */}
        {fullscreenBuilder && (
          <div
            className="scn-fullscreen-builder"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "var(--bg-1)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderBottom: "1px solid var(--border)",
                background: "var(--bg-2)",
                flexShrink: 0,
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 14 }}>
                {ico("construction")} Конструктор: {codeword}
              </span>
              <button
                className="wb-btn wb-btn-secondary"
                onClick={() => setFullscreenBuilder(false)}
                style={{ fontSize: 12, padding: "4px 10px" }}
              >
                {ico("close")} Закрити
              </button>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
              <PageBuilderInline
                config={(() => {
                  let cfg = createEmptyPageConfig();
                  try {
                    const raw = allFields.page_data;
                    const parsed = typeof raw === "string"
                      ? parsePageConfig(raw)
                      : typeof raw === "object" && raw !== null
                        ? (raw as PageConfigType)
                        : null;
                    if (parsed) cfg = parsed;
                  } catch { /* ignore */ }
                  return cfg;
                })()}
                onChange={(newCfg) => updateField("page_data", JSON.stringify(newCfg))}
                codeword={codeword}
                title={String(allFields.title ?? "")}
                photoUrl={String(allFields.photo_url ?? "")}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="wb-modal-footer">
          {success ? (
            <span className="usr-edit-success">✓ Збережено</span>
          ) : (
            <>
              <button
                className="wb-btn wb-btn-primary"
                onClick={handleSave}
                disabled={saving || loading}
              >
                {saving ? "Збереження…" : <>{ico("save")} Зберегти</>}
              </button>
              <button className="wb-btn wb-btn-secondary" onClick={onClose}>
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

// ─── Constructor per Tab ─────────────────────────────────────────

function TabConstructor({
  mainTab,
  fields,
  updateField,
  codeword,
  onFullscreen,
}: {
  mainTab: MainTab;
  fields: Record<string, unknown>;
  updateField: (key: string, value: unknown) => void;
  codeword: string;
  onFullscreen?: () => void;
}) {
  if (mainTab === "bot") return <BotConstructor fields={fields} updateField={updateField} />;
  if (mainTab === "bot_rich") return <BotRichConstructor fields={fields} updateField={updateField} />;
  if (mainTab === "web") return <WebConstructor fields={fields} updateField={updateField} codeword={codeword} onFullscreen={onFullscreen} />;
  return <div style={{ padding: 16, color: "var(--text-muted)", textAlign: "center" }}>Немає конструктора для цієї вкладки</div>;
}

// ─── Bot Constructor (buttons + captions) ─────────────────────────

function BotConstructor({
  fields,
  updateField,
}: {
  fields: Record<string, unknown>;
  updateField: (key: string, value: unknown) => void;
}) {
  const buttonsValue = typeof fields.buttons === "string" ? fields.buttons : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Caption fields */}
      <div className="wb-card">
        <div className="wb-card-header">
          <span className="wb-card-title">{ico("edit")} Підписи</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12 }}>
          <label className="block-label">
            Caption Top
            <textarea
              className="wb-textarea"
              rows={2}
              value={String(fields.caption_top ?? "")}
              onChange={(e) => updateField("caption_top", e.target.value)}
              placeholder="Верхній підпис..."
            />
          </label>
          <label className="block-label">
            Caption Mid
            <textarea
              className="wb-textarea"
              rows={2}
              value={String(fields.caption_mid ?? "")}
              onChange={(e) => updateField("caption_mid", e.target.value)}
              placeholder="Середній підпис..."
            />
          </label>
          <label className="block-label">
            Caption Bot
            <textarea
              className="wb-textarea"
              rows={2}
              value={String(fields.caption_bot ?? "")}
              onChange={(e) => updateField("caption_bot", e.target.value)}
              placeholder="Нижній підпис..."
            />
          </label>
        </div>
      </div>

      {/* Photo URL */}
      <div className="wb-card">
        <div className="wb-card-header">
          <span className="wb-card-title">{ico("image")} Фото</span>
        </div>
        <div style={{ padding: 12 }}>
          <label className="block-label">
            URL фото
            <input
              className="wb-input"
              value={String(fields.photo_url ?? "")}
              onChange={(e) => updateField("photo_url", e.target.value)}
              placeholder="https://..."
            />
          </label>
          {Boolean(fields.photo_url) && (
            <img
              src={String(fields.photo_url)}
              alt=""
              style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, marginTop: 8 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
        </div>
      </div>

      {/* Keyboard / Buttons */}
      <div className="wb-card">
        <div className="wb-card-header">
          <span className="wb-card-title">{ico("keyboard")} Клавіатура (кнопки)</span>
        </div>
        <div style={{ padding: 12 }}>
          <ButtonsField
            value={buttonsValue}
            onChange={(v) => updateField("buttons", v)}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Bot Rich Constructor (rich_data blocks) ──────────────────────

function BotRichConstructor({
  fields,
  updateField,
}: {
  fields: Record<string, unknown>;
  updateField: (key: string, value: unknown) => void;
}) {
  // For rich blocks, we import the rich blocks editor inline
  // We use a lazy approach — import the editor components
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Rich message toggle */}
      <div className="wb-card">
        <div className="wb-card-header">
          <span className="wb-card-title">{ico("sparkles")} Річ-повідомлення</span>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={fields.rich_message === "true" || fields.rich_message === "1"}
              onChange={(e) => updateField("rich_message", e.target.checked ? "true" : "false")}
            />
            Увімкнути Rich Message
          </label>
        </div>
      </div>

      {/* Rich text fields for caption using RichTextField */}
      <RichTextSection fields={fields} updateField={updateField} />

      {/* Rich data blocks */}
      <div className="wb-card">
        <div className="wb-card-header">
          <span className="wb-card-title">{ico("blocks")} Блоки повідомлення (rich_data)</span>
        </div>
        <div style={{ padding: 12 }}>
          <RichDataEditor
            value={String(fields.rich_data ?? "")}
            onChange={(v) => updateField("rich_data", v)}
          />
        </div>
      </div>

      {/* Keyboard / Buttons for rich messages */}
      <div className="wb-card">
        <div className="wb-card-header">
          <span className="wb-card-title">{ico("keyboard")} Клавіатура (кнопки)</span>
        </div>
        <div style={{ padding: 12 }}>
          <ButtonsField
            value={String(fields.buttons ?? "")}
            onChange={(v) => updateField("buttons", v)}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Rich Text Section (caption fields with formatting) ───────────

function RichTextSection({
  fields,
  updateField,
}: {
  fields: Record<string, unknown>;
  updateField: (key: string, value: unknown) => void;
}) {
  // Lazy load RichTextField to avoid circular deps
  const [RichTextField, setRichTextField] = useState<React.ComponentType<{
    value: unknown;
    onChange: (next: unknown) => void;
    multiline?: boolean;
    placeholder?: string;
    showPreview?: boolean;
  }> | null>(null);

  useEffect(() => {
    import("../../features/editor/richtext/RichTextField").then((mod) => {
      setRichTextField(() => mod.RichTextField);
    });
  }, []);

  if (!RichTextField) return <div style={{ padding: 12, color: "var(--text-muted)" }}>Завантаження редактора...</div>;

  return (
    <>
      <div className="wb-card">
        <div className="wb-card-header">
          <span className="wb-card-title">{ico("edit")} Caption Top (форматований)</span>
        </div>
        <div style={{ padding: 12 }}>
          <RichTextField
            value={fields.caption_top ?? ""}
            onChange={(v) => updateField("caption_top", v)}
            multiline
            placeholder="Верхній підпис..."
          />
        </div>
      </div>
      <div className="wb-card">
        <div className="wb-card-header">
          <span className="wb-card-title">{ico("edit")} Caption Mid (форматований)</span>
        </div>
        <div style={{ padding: 12 }}>
          <RichTextField
            value={fields.caption_mid ?? ""}
            onChange={(v) => updateField("caption_mid", v)}
            multiline
            placeholder="Середній підпис..."
          />
        </div>
      </div>
      <div className="wb-card">
        <div className="wb-card-header">
          <span className="wb-card-title">{ico("edit")} Caption Bot (форматований)</span>
        </div>
        <div style={{ padding: 12 }}>
          <RichTextField
            value={fields.caption_bot ?? ""}
            onChange={(v) => updateField("caption_bot", v)}
            multiline
            placeholder="Нижній підпис..."
          />
        </div>
      </div>
    </>
  );
}

// ─── Rich Data Editor (block-based JSON editor) ───────────────────

function RichDataEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [mode, setMode] = useState<"visual" | "json">("visual");
  const [jsonText, setJsonText] = useState(value);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const lastEmitted = useRef(value);

  // Sync from external changes
  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      setJsonText(value);
    }
  }, [value]);

  function emit(next: string) {
    lastEmitted.current = next;
    onChange(next);
  }

  // Try to parse rich_data as blocks for visual display
  let blocks: unknown[] = [];
  try {
    const parsed = JSON.parse(value);
    blocks = Array.isArray(parsed) ? parsed : [];
  } catch {
    blocks = [];
  }

  return (
    <>
      <div className="kb-toggle">
        <button
          type="button"
          className={`kb-toggle-btn${mode === "visual" ? " kb-toggle-btn--active" : ""}`}
          onClick={() => {
            setMode("visual");
            // Re-emit current value to sync
            emit(jsonText);
          }}
        >
          Візуально
        </button>
        <button
          type="button"
          className={`kb-toggle-btn${mode === "json" ? " kb-toggle-btn--active" : ""}`}
          onClick={() => {
            setMode("json");
            setJsonText(JSON.stringify(blocks, null, 2));
            setJsonError(null);
          }}
        >
          JSON
        </button>
      </div>

      {mode === "visual" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {blocks.length === 0 ? (
            <div style={{ padding: 16, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              Блоків немає. Перейдіть в JSON щоб додати блоки.
            </div>
          ) : (
            blocks.map((block, i) => {
              const b = block as Record<string, unknown>;
              const type = String(b.type || "unknown");
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    background: "var(--bg-secondary)",
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontWeight: 600, minWidth: 80 }}>{type}</span>
                  <span style={{ flex: 1, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {String(b.text ?? b.summary ?? b.url ?? "").slice(0, 80)}
                  </span>
                </div>
              );
            })
          )}
          <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
            Для додавання/редагування блоків використовуйте JSON-режим
          </div>
        </div>
      ) : (
        <>
          <textarea
            className="wb-textarea"
            rows={12}
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setJsonError(null);
              try {
                const parsed = JSON.parse(e.target.value);
                if (Array.isArray(parsed)) {
                  emit(e.target.value);
                }
              } catch {
                // Don't emit invalid JSON
              }
            }}
            style={{ fontFamily: "monospace", fontSize: 12, tabSize: 2 }}
          />
          {jsonError && (
            <p style={{ color: "var(--color-error, #ef4444)", fontSize: 12, marginTop: 4 }}>
              ⚠️ {jsonError}
            </p>
          )}
        </>
      )}
    </>
  );
}

// ─── Web Constructor (inline Page Builder) ──────────────────────

function WebConstructor({
  fields,
  updateField,
  codeword,
  onFullscreen,
}: {
  fields: Record<string, unknown>;
  updateField: (key: string, value: unknown) => void;
  codeword: string;
  onFullscreen?: () => void;
}) {
  // Parse page_data into PageConfig
  let config: PageConfigType = createEmptyPageConfig();
  try {
    const raw = fields.page_data;
    const parsed = typeof raw === "string"
      ? parsePageConfig(raw)
      : typeof raw === "object" && raw !== null
        ? (raw as PageConfigType)
        : null;
    if (parsed) config = parsed;
  } catch {
    config = createEmptyPageConfig();
  }

  const handleChange = useCallback((newConfig: PageConfigType) => {
    updateField("page_data", JSON.stringify(newConfig));
  }, [updateField]);

  return (
    <div style={{ padding: "0 0 16px" }}>
      <div style={{ marginBottom: 8, padding: 0, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
          {ico("construction", 14)} Конструктор
        </span>
        {onFullscreen && (
          <button
            className="wb-btn wb-btn-secondary"
            onClick={onFullscreen}
            style={{ fontSize: 11, padding: "3px 8px" }}
            title="Відкрити конструктор на весь екран"
          >
            {ico("eye", 14)} <span className="scn-hide-mobile">На весь екран</span>
          </button>
        )}
      </div>
      <PageBuilderInline
        config={config}
        onChange={handleChange}
        codeword={codeword}
        title={String(fields.title ?? "")}
        photoUrl={String(fields.photo_url ?? "")}
      />
    </div>
  );
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
  let config: PageConfig | null = null;
  try {
    const raw = fields.page_data;
    config = typeof raw === "string"
      ? parsePageConfig(raw)
      : typeof raw === "object" && raw !== null
        ? raw as PageConfig
        : null;
  } catch { /* ignore */ }

  if (!config) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>
        Сторінка порожня
        <div style={{ marginTop: 12, fontSize: 12 }}>
          Перейдіть на вкладку «Конструктор» щоб створити сторінку
        </div>
      </div>
    );
  }

  const context: BlockContext = {
    codeword,
    title: (fields.title as string) ?? null,
    photoUrl: (fields.photo_url as string) ?? null,
  };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
      <div className="phone-frame">
        <div className="phone-frame-body">
          <PageRenderer config={config} context={context} />
        </div>
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
        {ico("camera")} Слайдшоу
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
        <button className="wb-btn wb-btn-secondary" onClick={onCopy} style={{ fontSize: 12, padding: "4px 10px" }}>
          {copied ? <>{ico("check")} Скопійовано</> : <>{ico("copy")} Копіювати</>}
        </button>
        <button className="wb-btn wb-btn-secondary" onClick={onFormat} style={{ fontSize: 12, padding: "4px 10px" }}>
          {ico("sparkles")} Форматувати
        </button>
        <button className="wb-btn wb-btn-primary" onClick={onApply} disabled={!!jsonError || !jsonText.trim()} style={{ fontSize: 12, padding: "4px 10px" }}>
          {ico("check")} Застосувати
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
          minHeight: 200,
          padding: "12px 16px",
          border: "1px solid var(--border)",
          borderRadius: 6,
          outline: "none",
          resize: "vertical",
          fontFamily: "monospace",
          fontSize: 12,
          lineHeight: 1.5,
          background: "var(--bg-primary, #fff)",
          color: "var(--text-primary, #1a1a2e)",
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
