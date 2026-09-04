/**
 * ScenarioPreview — компоненти попереднього перегляду для кожної вкладки.
 *
 * WebPreview — Phone-frame з PageRenderer
 * BotRichPreview — Telegram-подібне повідомлення з rich блоками
 * BotPreview — Telegram-подібне повідомлення з фото/підписом/кнопками
 * SharedPreview — Таблиця спільних полів
 */

import { icons, type IconName } from '@wwwuabot/shared';
import { PageRenderer } from '@wwwuabot/ui';
import type { PageConfig, BlockContext } from '@wwwuabot/shared/types/page-config';
import { parsePageConfig } from '@wwwuabot/shared/types/page-config';
import type { MainTab } from './scenario-modal-types';

// ── Icon helper ───────────────────────────────────────────────────

const ico = (name: IconName, size = 16) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', width: size, height: size, flexShrink: 0 }}>
    {icons[name]}
  </span>
);

// ── Main Router ───────────────────────────────────────────────────

interface TabPreviewProps {
  mainTab: MainTab;
  fields: Record<string, unknown>;
  codeword: string;
}

export function TabPreview({ mainTab, fields, codeword }: TabPreviewProps) {
  if (mainTab === 'web') return <WebPreview fields={fields} codeword={codeword} />;
  if (mainTab === 'bot_rich') return <BotRichPreview fields={fields} />;
  if (mainTab === 'bot') return <BotPreview fields={fields} />;
  return <SharedPreview fields={fields} />;
}

// ── Web Preview ───────────────────────────────────────────────────

function WebPreview({ fields, codeword }: { fields: Record<string, unknown>; codeword: string }) {
  let config: PageConfig | null = null;
  try {
    const raw = fields.page_data;
    config = typeof raw === 'string'
      ? parsePageConfig(raw)
      : typeof raw === 'object' && raw !== null
        ? raw as PageConfig
        : null;
  } catch { /* ignore */ }

  if (!config) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
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
    <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
      <div className="phone-frame">
        <div className="phone-frame-body">
          <PageRenderer config={config} context={context} />
        </div>
      </div>
    </div>
  );
}

// ── Bot Rich Preview ──────────────────────────────────────────────

function BotRichPreview({ fields }: { fields: Record<string, unknown> }) {
  let richData: unknown[] = [];
  try {
    const raw = fields.rich_data;
    richData = typeof raw === 'string' ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
  } catch { /* ignore */ }

  if (richData.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Rich Data порожній</div>;
  }

  return (
    <div className="tg-message" style={{ maxWidth: 380, margin: '0 auto' }}>
      {richData.map((block, i) => <RichBlock key={i} block={block as Record<string, unknown>} />)}
    </div>
  );
}

// ── Rich Block Renderer ───────────────────────────────────────────

function RichBlock({ block }: { block: Record<string, unknown> }) {
  const type = String(block.type || '');

  if (type === 'heading') {
    const level = Number(block.level) || 2;
    return <div className={`tg-heading tg-heading--h${level}`}>{String(block.text || '')}</div>;
  }
  if (type === 'paragraph') {
    return <div className="tg-paragraph">{String(block.text || '')}</div>;
  }
  if (type === 'divider') {
    return <hr className="tg-divider" />;
  }
  if (type === 'photo') {
    return <img src={String(block.url || block.photo_url || '')} alt="" className="tg-photo" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />;
  }
  if (type === 'list') {
    const items = Array.isArray(block.items) ? block.items : [];
    return (
      <ul className="tg-list">
        {items.map((item: unknown, i: number) => (
          <li key={i}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
        ))}
      </ul>
    );
  }
  if (type === 'blockquote') {
    const text = String(block.text || '');
    const children = Array.isArray(block.children) ? block.children : [];
    return (
      <div className="tg-blockquote">
        {text && <div className="tg-paragraph">{text}</div>}
        {children.map((child: unknown, i: number) => (
          <div key={i} style={{ marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}>{typeof child === 'string' ? child : JSON.stringify(child)}</div>
        ))}
      </div>
    );
  }
  if (type === 'details') {
    const summary = String(block.summary || 'Деталі');
    const children = Array.isArray(block.children) ? block.children : [];
    return (
      <div className="tg-details">
        <div className="tg-details-summary">{summary}</div>
        <div className="tg-details-body">
          {children.map((child: unknown, i: number) => (
            <div key={i} style={{ marginTop: 4, fontSize: 13 }}>{typeof child === 'string' ? child : JSON.stringify(child)}</div>
          ))}
        </div>
      </div>
    );
  }
  if (type === 'footer') {
    return <div className="tg-footer">{String(block.text || '')}</div>;
  }
  if (type === 'slideshow') {
    return (
      <div style={{ padding: '6px 10px', background: 'var(--bg-2)', borderRadius: 6, fontSize: 12, color: 'var(--text-muted)', border: '1px dashed var(--border)', textAlign: 'center' }}>
        {ico('camera')} Слайдшоу
      </div>
    );
  }
  return (
    <div className="tg-unknown">
      [{type || 'unknown'}]
    </div>
  );
}

// ── Bot Preview ───────────────────────────────────────────────────

function BotPreview({ fields }: { fields: Record<string, unknown> }) {
  const photoUrl = String(fields.photo_url || '');
  const caption = [fields.caption_top, fields.caption_mid, fields.caption_bot]
    .filter(Boolean).join('\n───────\n');

  let buttons: unknown[][] = [];
  try {
    const raw = fields.buttons;
    buttons = typeof raw === 'string' ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
  } catch { /* ignore */ }

  return (
    <div className="tg-message" style={{ maxWidth: 380, margin: '0 auto' }}>
      {photoUrl && <img src={photoUrl} alt="" className="tg-photo" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
      {caption ? <div className="tg-caption">{caption}</div> : <div className="tg-message-placeholder">Порожнє повідомлення</div>}
      {buttons.length > 0 && (
        <div className="tg-buttons">
          {buttons.map((row, i) => (
            <div key={i} className="tg-btn-row">
              {row.map((btn, j) => (
                <span key={j} className="tg-btn">{typeof btn === 'string' ? btn : (btn as { text?: string }).text || '?'}</span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared Preview ────────────────────────────────────────────────

function SharedPreview({ fields }: { fields: Record<string, unknown> }) {
  return (
    <div style={{ padding: 16 }}>
      <table className="usr-card-table" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th className="usr-card-th-field">Поле</th>
            <th className="usr-card-th-value">Значення</th>
          </tr>
        </thead>
        <tbody>
          {['codeword', 'title', 'created_at', 'updated_at'].map((key) => (
            <tr key={key}>
              <td className="usr-card-td-field">{key}</td>
              <td className="usr-card-td-value" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                {fields[key] === null || fields[key] === undefined ? '—' : String(fields[key])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
