/**
 * ScenarioCardModal — єдиний модальний блок редагування сценарію.
 *
 * Головні вкладки:  Веб (замовч.), Бот-Річ+Кнопки, Бот+Кнопки, Спільне
 * Підвкладки:       Прев'ю (замовч.), JSON, Конструктор
 *
 * Рефакторинг: компоненти винесені в окремі файли.
 * FIX: Надійна підтримка редагування та збереження JSON (як прямого PageConfig, так і { page_data: ... }).
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  readScenarioAll,
  updateScenarioFields,
  type ScenarioTable,
} from '../../shared/api/scenarios.api';
import { registerAllBlocks } from '@wwwuabot/ui/blocks';
import { icons, type IconName } from '@wwwuabot/shared';
import {
  type MainTab,
  type SubTab,
  MAIN_TABS,
  MAIN_TAB_ICONS,
  SUB_TABS,
  SUB_TAB_ICONS,
  getFieldsForTab,
} from './scenario-modal-types';
import {
  deserializeJsonFields,
  serializeJsonFields,
  extractFieldsFromJson,
} from './scenario-json-helpers';
import { BotConstructor } from './BotConstructor';
import { BotRichConstructor } from './BotRichConstructor';
import { WebConstructor } from './WebConstructor';
import { TabPreview } from './ScenarioPreview';
import { ScenarioJsonEditor } from './ScenarioJsonEditor';
import { FullscreenBuilder } from './FullscreenBuilder';
import { SaveActionButtons, type SavingActionType } from '@wwwuabot/shared';

// ── Icon helper ───────────────────────────────────────────────────

const ico = (name: IconName, size = 16) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', width: size, height: size, flexShrink: 0 }}>
    {icons[name]}
  </span>
);

// Register blocks once on module load
registerAllBlocks();

// ── Props ─────────────────────────────────────────────────────────

interface Props {
  codeword: string;
  table: ScenarioTable;
  onClose: () => void;
  onSaved: () => void;
  initialSubTab?: SubTab;
}

// ── Component ─────────────────────────────────────────────────────

export function ScenarioCardModal({ codeword, table, onClose, onSaved, initialSubTab }: Props) {
  const [mainTab, setMainTab] = useState<MainTab>('web');
  const [subTab, setSubTab] = useState<SubTab>(initialSubTab ?? 'preview');
  const [allFields, setAllFields] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAction, setSavingAction] = useState<SavingActionType>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fullscreenBuilder, setFullscreenBuilder] = useState(false);

  // JSON editor state
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Refs to track tab switches without wiping unsaved JSON text on keystrokes
  const prevSubTabRef = useRef<SubTab>(subTab);
  const prevMainTabRef = useRef<MainTab>(mainTab);

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
          setError('Сценарій не знайдено');
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

  // ── Update a single field ──
  const updateField = useCallback((key: string, value: unknown) => {
    setAllFields((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ── Save handler (processes jsonText if currently on json subtab) ──
  const handleSave = useCallback(async (shouldClose: boolean = false) => {
    setSaving(true);
    setSavingAction(shouldClose ? "saveAndClose" : "save");
    setError(null);
    setJustSaved(false);
    try {
      let fieldsToSave = { ...allFields };

      // Якщо користувач знаходиться на підвкладці JSON,
      // обов'язково валідуємо та застосовуємо поточний текст редактора!
      if (subTab === 'json') {
        const trimmed = jsonText.trim();
        if (!trimmed) {
          throw new Error('JSON редактор порожній');
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(trimmed);
        } catch {
          setJsonError('Невалідний JSON');
          throw new Error('Неможливо зберегти: невалідний JSON у редакторі');
        }
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          setJsonError('JSON має бути об\'єктом');
          throw new Error('Неможливо зберегти: JSON має бути об\'єктом');
        }

        fieldsToSave = extractFieldsFromJson(
          parsed as Record<string, unknown>,
          mainTab,
          fieldsToSave,
        );
        setAllFields(fieldsToSave);
      }

      const PROTECTED = new Set(['codeword', 'created_at']);
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fieldsToSave)) {
        if (PROTECTED.has(key)) continue;
        if (key === 'updated_at') continue;
        payload[key] = value;
      }

      // Серіалізуємо об'єкти у строки перед відправкою до D1 SQLite
      const serializedPayload = serializeJsonFields(payload);
      await updateScenarioFields(codeword, serializedPayload, table);

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
  }, [codeword, allFields, table, onSaved, onClose, subTab, jsonText, mainTab]);

  // ── Keyboard shortcuts (Escape to close, Ctrl+S / Cmd+S to save) ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!saving && !loading) {
          void handleSave(false);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, handleSave, saving, loading]);

  // ── JSON helpers ──
  const openJsonTab = useCallback(() => {
    const tabFields = getFieldsForTab(mainTab, allFields);
    const deserializedTabFields = deserializeJsonFields(tabFields, mainTab);
    setJsonText(JSON.stringify(deserializedTabFields, null, 2));
    setJsonError(null);
    setCopied(false);
    setApplied(false);
    setSubTab('json');
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
      const trimmed = jsonText.trim();
      if (!trimmed) {
        setJsonError('JSON редактор порожній');
        return;
      }
      const parsed = JSON.parse(trimmed);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setJsonError('JSON має бути об\'єктом');
        return;
      }
      const updated = extractFieldsFromJson(
        parsed as Record<string, unknown>,
        mainTab,
        allFields,
      );
      setAllFields(updated);
      setJsonError(null);
      setApplied(true);
      setTimeout(() => setApplied(false), 2000);
    } catch {
      setJsonError('Невалідний JSON');
    }
  }, [jsonText, mainTab, allFields]);

  const handleJsonChange = useCallback((value: string) => {
    setJsonText(value);
    setJsonError(null);
    setApplied(false);
    try {
      JSON.parse(value);
    } catch {
      setJsonError('Невалідний JSON');
    }
  }, []);

  // ── Auto-populate JSON text when switching into json tab or changing main tab ──
  useEffect(() => {
    const justOpenedJson = subTab === 'json' && prevSubTabRef.current !== 'json';
    const mainTabChangedInJson = subTab === 'json' && prevMainTabRef.current !== mainTab;

    if (justOpenedJson || mainTabChangedInJson) {
      const tabFields = getFieldsForTab(mainTab, allFields);
      const deserializedTabFields = deserializeJsonFields(tabFields, mainTab);
      setJsonText(JSON.stringify(deserializedTabFields, null, 2));
      setJsonError(null);
      setCopied(false);
      setApplied(false);
    }
    prevSubTabRef.current = subTab;
    prevMainTabRef.current = mainTab;
  }, [subTab, mainTab, allFields]);

  // ── Render constructor per tab ──
  const renderConstructor = () => {
    if (mainTab === 'bot') return <BotConstructor fields={allFields} updateField={updateField} />;
    if (mainTab === 'bot_rich') return <BotRichConstructor fields={allFields} updateField={updateField} />;
    if (mainTab === 'web') return <WebConstructor fields={allFields} updateField={updateField} codeword={codeword} onFullscreen={() => setFullscreenBuilder(true)} />;
    return <div style={{ padding: 16, color: 'var(--text-muted)', textAlign: 'center' }}>Немає конструктора для цієї вкладки</div>;
  };

  // ═══ RENDER ════════════════════════════════════════════════════════

  return (
    <div className="wb-modal-overlay" onClick={onClose}>
      <div
        className="wb-modal scn-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 900, width: '100%', height: '90dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {/* Header */}
        <div className="wb-modal-header">
          <span className="wb-modal-title">{ico('clipboard')} {codeword}</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <a
              href={`/${codeword}`}
              target="_blank"
              rel="noopener noreferrer"
              className="wb-btn wb-btn-secondary"
              style={{ fontSize: 12, padding: '4px 10px', textDecoration: 'none' }}
            >
              {ico('link')} Перейти
            </a>
            <button className="wb-close-btn" onClick={onClose}>{icons['close']}</button>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="scn-tabs">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.key}
              className={`scn-tab${mainTab === tab.key ? ' scn-tab--active' : ''}`}
              onClick={() => { setMainTab(tab.key); setSubTab('preview'); }}
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
              className={`scn-subtab${subTab === st.key ? ' scn-subtab--active' : ''}`}
              onClick={() => {
                if (st.key === 'json') {
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
        <div className="wb-modal-body" style={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <div className="wb-modal-loading">Завантаження…</div>
          ) : error && Object.keys(allFields).length === 0 ? (
            <div className="wb-modal-error">{error}</div>
          ) : subTab === 'preview' ? (
            <TabPreview mainTab={mainTab} fields={allFields} codeword={codeword} />
          ) : subTab === 'json' ? (
            <ScenarioJsonEditor
              jsonText={jsonText}
              jsonError={jsonError}
              copied={copied}
              applied={applied}
              saving={saving}
              textareaRef={textareaRef}
              onChange={handleJsonChange}
              onCopy={handleJsonCopy}
              onFormat={handleJsonFormat}
              onApply={handleJsonApply}
              onSave={handleSave}
            />
          ) : subTab === 'constructor' ? (
            renderConstructor()
          ) : null}

          {error && Object.keys(allFields).length > 0 && (
            <div className="wb-modal-error" style={{ marginTop: 8 }}>{error}</div>
          )}
        </div>

        {/* Fullscreen Page Builder overlay */}
        {fullscreenBuilder && (
          <FullscreenBuilder
            codeword={codeword}
            allFields={allFields}
            updateField={updateField}
            onClose={() => setFullscreenBuilder(false)}
            onSave={(shouldClose) => handleSave(shouldClose)}
            saving={saving}
            savingAction={savingAction}
            saved={justSaved}
          />
        )}

        {/* Footer — єдиний модуль дій збереження та закриття */}
        <div className="wb-modal-footer">
          <SaveActionButtons
            onSaveAndClose={() => handleSave(true)}
            onSave={() => handleSave(false)}
            onClose={onClose}
            saving={saving}
            savingAction={savingAction}
            loading={loading}
            saved={justSaved}
            success={success}
          />
        </div>
      </div>
    </div>
  );
}
