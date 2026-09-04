/**
 * DateModal — модальне вікно для створення/редагування/перегляду дати.
 */

import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { icons, type IconName } from '@wwwuabot/shared';
import type { MyDate } from '@/shared/api/mydate.api';
import { type ModalMode, getTagColor, getTypeConfig, formatDate } from './mydate-types';

// ── Icon helper ───────────────────────────────────────────────────

const ico = (name: IconName, size = 16) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', width: size, height: size, flexShrink: 0 }}>
    {icons[name]}
  </span>
);

// ── Props ─────────────────────────────────────────────────────────

interface DateModalProps {
  mode: ModalMode;
  date: MyDate | null;
  allTags: string[];
  onClose: () => void;
  onSave: (data: Partial<MyDate>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSwitchToEdit: () => void;
}

// ── Component ─────────────────────────────────────────────────────

export function DateModal({
  mode,
  date,
  allTags,
  onClose,
  onSave,
  onDelete,
  onSwitchToEdit,
}: DateModalProps) {
  const [formDate, setFormDate] = useState(date?.date || '');
  const [formType, setFormType] = useState(date?.type || 'person');
  const [formName, setFormName] = useState(date?.name || '');
  const [formTags, setFormTags] = useState<string[]>(date?.tags || []);
  const [formNotes, setFormNotes] = useState(date?.notes || '');
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const tagSuggestions = useMemo(() => {
    if (!tagInput.trim()) return allTags.filter((t) => !formTags.includes(t)).slice(0, 8);
    const search = tagInput.toLowerCase();
    return allTags
      .filter((t) => t.toLowerCase().includes(search) && !formTags.includes(t))
      .slice(0, 8);
  }, [tagInput, allTags, formTags]);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !formTags.includes(trimmed)) {
      setFormTags([...formTags, trimmed]);
    }
    setTagInput('');
    setShowTagSuggestions(false);
    tagInputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    setFormTags(formTags.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tagInput.trim()) addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && formTags.length > 0) {
      setFormTags(formTags.slice(0, -1));
    }
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await onSave({
        id: date?.id,
        date: formDate,
        type: formType,
        name: formName,
        tags: formTags,
        notes: formNotes,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!date?.id) return;
    if (!confirm('Видалити цю дату?')) return;
    await onDelete(date.id);
  };

  const isReadOnly = mode === 'view';

  return (
    <div className="wb-modal-overlay" onClick={onClose}>
      <div className="wb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wb-modal-header">
          <h3>
            {mode === 'create' && 'Нова дата'}
            {mode === 'edit' && 'Редагувати дату'}
            {mode === 'view' && (date?.name || formatDate(date?.date || ''))}
          </h3>
          <button className="wb-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="wb-modal-body">
          <div className="form-field">
            <label className="form-label">Дата *</label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              className="wb-input"
              disabled={isReadOnly}
            />
          </div>

          <div className="form-field">
            <label className="form-label">Тип</label>
            <div className="type-selector">
              {['person', 'event', 'other'].map((t) => {
                const cfg = getTypeConfig(t);
                return (
                  <button
                    key={t}
                    type="button"
                    className={`wb-btn wb-btn-sm ${formType === t ? 'wb-btn-primary' : 'wb-btn-secondary'}`}
                    onClick={() => !isReadOnly && setFormType(t)}
                    disabled={isReadOnly}
                  >
                    {ico(cfg.icon)} {t === 'person' ? 'Людина' : t === 'event' ? 'Подія' : 'Інше'}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">Назва / Псевдонім</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="напр. Олексій, Новий рік..."
              className="wb-input"
              disabled={isReadOnly}
            />
          </div>

          <div className="form-field">
            <label className="form-label">Теги</label>
            <div className="tags-input-wrapper">
              {formTags.map((tag) => (
                <span key={tag} className="tag-chip" style={getTagColor(tag)}>
                  {tag}
                  {!isReadOnly && (
                    <button type="button" className="tag-remove" onClick={() => removeTag(tag)}>
                      ×
                    </button>
                  )}
                </span>
              ))}
              {!isReadOnly && (
                <div className="tag-input-container">
                  <input
                    ref={tagInputRef}
                    type="text"
                    value={tagInput}
                    onChange={(e) => {
                      setTagInput(e.target.value);
                      setShowTagSuggestions(true);
                    }}
                    onFocus={() => setShowTagSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowTagSuggestions(false), 150)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={formTags.length === 0 ? 'Додайте теги...' : ''}
                    className="wb-input"
                  />
                  {showTagSuggestions && tagSuggestions.length > 0 && (
                    <div className="tag-suggestions">
                      {tagSuggestions.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className="tag-suggestion-item"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            addTag(tag);
                          }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">Примітки</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Додаткова інформація..."
              className="wb-textarea"
              rows={3}
              disabled={isReadOnly}
            />
          </div>
        </div>

        <div className="wb-modal-footer">
          {mode === 'view' ? (
            <>
              <Link
                className="wb-btn wb-btn-sm wb-btn-analyze"
                to={`/mydate/${date?.date}`}
                onClick={onClose}
              >
                {ico('compare')} Аналіз
              </Link>
              <button className="wb-btn wb-btn-secondary wb-btn-sm" onClick={onSwitchToEdit}>
                {ico('edit')} Редагувати
              </button>
              <button className="wb-btn wb-btn-danger wb-btn-sm" onClick={handleDelete}>
                {ico('trash')} Видалити
              </button>
            </>
          ) : (
            <>
              <button className="wb-btn wb-btn-secondary wb-btn-sm" onClick={onClose} disabled={submitting}>
                Скасувати
              </button>
              <button
                className="wb-btn wb-btn-sm"
                onClick={handleSave}
                disabled={!formDate || submitting}
              >
                {submitting ? 'Зберігаємо...' : mode === 'create' ? 'Додати' : 'Зберегти'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
