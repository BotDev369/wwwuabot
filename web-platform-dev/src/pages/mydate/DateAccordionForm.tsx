/**
 * DateAccordionForm — акордеон-форма для швидкого додавання нової дати.
 */

import { useState, useMemo, useRef } from 'react';
import { icons, type IconName } from '@wwwuabot/shared';
import type { MyDate } from '@/shared/api/mydate.api';
import { getTypeConfig, getTagColor } from './mydate-types';

// ── Icon helper ───────────────────────────────────────────────────

const ico = (name: IconName, size = 16) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', width: size, height: size, flexShrink: 0 }}>
    {icons[name]}
  </span>
);

// ── Props ─────────────────────────────────────────────────────────

interface DateAccordionFormProps {
  isOpen: boolean;
  onToggle: () => void;
  allTags: string[];
  onSubmit: (data: Omit<MyDate, 'id' | 'created_at' | 'user_id' | 'updated_at'>) => Promise<void>;
}

// ── Component ─────────────────────────────────────────────────────

export function DateAccordionForm({ isOpen, onToggle, allTags, onSubmit }: DateAccordionFormProps) {
  const [formDate, setFormDate] = useState('');
  const [formType, setFormType] = useState('person');
  const [formName, setFormName] = useState('');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formNotes, setFormNotes] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const formTagSuggestions = useMemo(() => {
    if (!tagInput.trim()) return allTags.filter((t) => !formTags.includes(t)).slice(0, 8);
    const search = tagInput.toLowerCase();
    return allTags
      .filter((t) => t.toLowerCase().includes(search) && !formTags.includes(t))
      .slice(0, 8);
  }, [tagInput, allTags, formTags]);

  const addFormTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !formTags.includes(trimmed)) setFormTags([...formTags, trimmed]);
    setTagInput('');
    setShowTagSuggestions(false);
    tagInputRef.current?.focus();
  };

  const removeFormTag = (tag: string) => setFormTags(formTags.filter((t) => t !== tag));

  const handleFormTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tagInput.trim()) addFormTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && formTags.length > 0)
      setFormTags(formTags.slice(0, -1));
  };

  const resetForm = () => {
    setFormDate('');
    setFormType('person');
    setFormName('');
    setFormTags([]);
    setFormNotes('');
    setTagInput('');
  };

  const handleSubmit = async () => {
    if (!formDate) return;
    setSubmitting(true);
    try {
      await onSubmit({
        date: formDate,
        type: formType,
        name: formName,
        tags: formTags,
        notes: formNotes,
      });
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`accordion ${isOpen ? 'open' : ''}`}>
      <button className="accordion-toggle" onClick={onToggle}>
        <span className={`accordion-icon ${isOpen ? 'rotated' : ''}`}>▶</span>
        {isOpen ? 'Додати нову дату' : '＋ Додати дату'}
      </button>
      {isOpen && (
        <div className="accordion-content">
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Дата *</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="wb-input"
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
                      onClick={() => setFormType(t)}
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
                placeholder="напр. Олексій..."
                className="wb-input"
              />
            </div>
            <div className="form-field full-width">
              <label className="form-label">Теги</label>
              <div className="tags-input-wrapper">
                {formTags.map((tag) => (
                  <span key={tag} className="tag-chip" style={getTagColor(tag)}>
                    {tag}
                    <button
                      type="button"
                      className="tag-remove"
                      onClick={() => removeFormTag(tag)}
                    >
                      ×
                    </button>
                  </span>
                ))}
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
                    onKeyDown={handleFormTagKeyDown}
                    placeholder={formTags.length === 0 ? 'Додайте теги...' : ''}
                    className="wb-input"
                  />
                  {showTagSuggestions && formTagSuggestions.length > 0 && (
                    <div className="tag-suggestions">
                      {formTagSuggestions.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className="tag-suggestion-item"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            addFormTag(tag);
                          }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="form-field full-width">
              <label className="form-label">Примітки</label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Додаткова інформація..."
                className="wb-textarea"
                rows={2}
              />
            </div>
          </div>
          <button
            className="wb-btn wb-btn-sm"
            onClick={handleSubmit}
            disabled={!formDate || submitting}
          >
            {submitting ? 'Додаємо...' : 'Додати дату'}
          </button>
        </div>
      )}
    </div>
  );
}
