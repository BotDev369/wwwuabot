/**
 * BotConstructor — конструктор для "Бот + Кнопки".
 *
 * Містить редактори підписів, URL фото та клавіатури.
 */

import { icons, type IconName } from '@wwwuabot/shared';
import { ButtonsField } from '../../features/scenarios/keyboard/ButtonsField';

// ── Icon helper ───────────────────────────────────────────────────

const ico = (name: IconName, size = 16) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', width: size, height: size, flexShrink: 0 }}>
    {icons[name]}
  </span>
);

// ── Props ─────────────────────────────────────────────────────────

interface BotConstructorProps {
  fields: Record<string, unknown>;
  updateField: (key: string, value: unknown) => void;
}

// ── Component ─────────────────────────────────────────────────────

export function BotConstructor({ fields, updateField }: BotConstructorProps) {
  const buttonsValue = typeof fields.buttons === 'string' ? fields.buttons : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Caption fields */}
      <div className="wb-card">
        <div className="wb-card-header">
          <span className="wb-card-title">{ico('edit')} Підписи</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
          <label className="block-label">
            Caption Top
            <textarea
              className="wb-textarea"
              rows={2}
              value={String(fields.caption_top ?? '')}
              onChange={(e) => updateField('caption_top', e.target.value)}
              placeholder="Верхній підпис..."
            />
          </label>
          <label className="block-label">
            Caption Mid
            <textarea
              className="wb-textarea"
              rows={2}
              value={String(fields.caption_mid ?? '')}
              onChange={(e) => updateField('caption_mid', e.target.value)}
              placeholder="Середній підпис..."
            />
          </label>
          <label className="block-label">
            Caption Bot
            <textarea
              className="wb-textarea"
              rows={2}
              value={String(fields.caption_bot ?? '')}
              onChange={(e) => updateField('caption_bot', e.target.value)}
              placeholder="Нижній підпис..."
            />
          </label>
        </div>
      </div>

      {/* Photo URL */}
      <div className="wb-card">
        <div className="wb-card-header">
          <span className="wb-card-title">{ico('image')} Фото</span>
        </div>
        <div style={{ padding: 12 }}>
          <label className="block-label">
            URL фото
            <input
              className="wb-input"
              value={String(fields.photo_url ?? '')}
              onChange={(e) => updateField('photo_url', e.target.value)}
              placeholder="https://..."
            />
          </label>
          {Boolean(fields.photo_url) && (
            <img
              src={String(fields.photo_url)}
              alt=""
              style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, marginTop: 8 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </div>
      </div>

      {/* Keyboard / Buttons */}
      <div className="wb-card">
        <div className="wb-card-header">
          <span className="wb-card-title">{ico('keyboard')} Клавіатура (кнопки)</span>
        </div>
        <div style={{ padding: 12 }}>
          <ButtonsField
            value={buttonsValue}
            onChange={(v) => updateField('buttons', v)}
          />
        </div>
      </div>
    </div>
  );
}
