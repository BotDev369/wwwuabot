/**
 * ScenarioCardModal — єдиний модальний блок редагування сценарію.
 *
 * Головні вкладки:  Веб (замовч.), Бот-Річ+Кнопки, Бот+Кнопки, Спільне
 * Підвкладки:       Прев'ю (замовч.), JSON, Конструктор
 *
 * Рефакторинг: компоненти винесені в окремі файли.
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
import { BotConstructor } from './BotConstructor';
import { BotRichConstructor } from './BotRichConstructor';
import { WebConstructor } from './WebConstructor';
import { TabPreview } from './ScenarioPreview';
import { ScenarioJsonEditor } from './ScenarioJsonEditor';
import { FullscreenBuilder } from './FullscreenBuilder';

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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fullscreenBuilder, setFullscreenBuilder] = useState(false);

  // JSON editor state
  const [jsonText, setJsonText] = useState('');
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

  // ── Escape to close ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
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
      const PROTECTED = new Set(['codeword', 'created_at']);
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(allFields)) {
        if (PROTECTED.has(key)) continue;
        if (key === 'updated_at') continue;
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
      const parsed = JSON.parse(jsonText);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setJsonError('JSON має бути об\'єктом');
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
      setSubTab('preview');
    } catch {
      setJsonError('Невалідний JSON');
    }
  }, [jsonText, mainTab, allFields]);

  const handleJsonChange = useCallback((value: string) => {
    setJsonText(value);
    setJsonError(null);
    try {
      JSON.parse(value);
    } catch {
      setJsonError('Невалідний JSON');
    }
  }, []);

  // ── When switching to JSON sub-tab, auto-populate ──
  useEffect(() => {
    if (subTab === 'json') {
      const tabFields = getFieldsForTab(mainTab, allFields);
      setJsonText(JSON.stringify(tabFields, null, 2));
      setJsonError(null);
    }
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
              textareaRef={textareaRef}
              onChange={handleJsonChange}
              onCopy={handleJsonCopy}
              onFormat={handleJsonFormat}
              onApply={handleJsonApply}
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
          />
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
                {saving ? 'Збереження…' : <>{ico('save')} Зберегти</>}
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
