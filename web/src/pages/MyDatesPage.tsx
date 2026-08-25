import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */

interface MyDate {
  id: string;
  user_id: number;
  date: string;
  type: string;
  name: string;
  tags: string[];
  notes: string;
  created_at: string;
  updated_at: string;
  // Legacy fields (backward compat)
  alias?: string;
  category?: string;
}

type SortField = 'date' | 'type' | 'name' | 'tags' | 'notes' | 'created_at';
type SortOrder = 'asc' | 'desc';
type ModalMode = 'create' | 'edit' | 'view';

const TYPE_CONFIG: Record<string, { emoji: string; color: string; bg: string }> = {
  person:  { emoji: '👤', color: '#2563eb', bg: '#eff6ff' },
  event:   { emoji: '🎉', color: '#059669', bg: '#ecfdf5' },
  other:   { emoji: '📌', color: '#7c3aed', bg: '#f5f3ff' },
};

const TAG_COLORS = [
  { color: '#b45309', bg: '#fef3c7' },
  { color: '#0e7490', bg: '#ecfeff' },
  { color: '#be185d', bg: '#fdf2f8' },
  { color: '#4338ca', bg: '#eef2ff' },
  { color: '#047857', bg: '#ecfdf5' },
  { color: '#c2410c', bg: '#fff7ed' },
  { color: '#7c3aed', bg: '#f5f3ff' },
  { color: '#0369a1', bg: '#f0f9ff' },
];

function getTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.other;
}

function getTelegramUserId(): number | null {
  try {
    return (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id ?? null;
  } catch {
    return null;
  }
}

function formatDate(raw: string): string {
  const parts = raw.split('-');
  if (parts.length !== 3) return raw;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function formatDateShort(_raw: string): string {
  // Повна дата: DD.MM.YYYY
  return formatDate(_raw);
}

function getCustomTypes(dates: MyDate[]): string[] {
  const builtins = ['person', 'event', 'other'];
  const custom = dates
    .map(d => d.type)
    .filter(t => t && !builtins.includes(t));
  return [...new Set(custom)];
}

/* ═══════════════════════════════════════════════
   MODAL COMPONENT
   ═══════════════════════════════════════════════ */

function DateModal({
  mode, date, allTags, onClose, onSave, onDelete, onSwitchToEdit,
}: {
  mode: ModalMode;
  date: MyDate | null;
  allTags: string[];
  onClose: () => void;
  onSave: (data: Partial<MyDate>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSwitchToEdit: () => void;
}) {
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
    if (!tagInput.trim()) return allTags.filter(t => !formTags.includes(t)).slice(0, 8);
    const search = tagInput.toLowerCase();
    return allTags.filter(t => t.toLowerCase().includes(search) && !formTags.includes(t)).slice(0, 8);
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
    setFormTags(formTags.filter(t => t !== tag));
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {mode === 'create' && 'Нова дата'}
            {mode === 'edit' && 'Редагувати дату'}
            {mode === 'view' && (date?.name || formatDate(date?.date || ''))}
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Дата */}
          <div className="form-field">
            <label className="form-label">Дата *</label>
            <input
              type="date"
              value={formDate}
              onChange={e => setFormDate(e.target.value)}
              className="date-input"
              disabled={isReadOnly}
            />
          </div>

          {/* Тип */}
          <div className="form-field">
            <label className="form-label">Тип</label>
            <div className="type-selector">
              {['person', 'event', 'other'].map(t => {
                const cfg = getTypeConfig(t);
                return (
                  <button
                    key={t}
                    type="button"
                    className={`type-chip ${formType === t ? 'active' : ''}`}
                    style={{
                      borderColor: formType === t ? cfg.color : '#e5e5e5',
                      background: formType === t ? cfg.bg : '#fff',
                      color: formType === t ? cfg.color : '#666',
                    }}
                    onClick={() => !isReadOnly && setFormType(t)}
                    disabled={isReadOnly}
                  >
                    {cfg.emoji} {t === 'person' ? 'Людина' : t === 'event' ? 'Подія' : 'Інше'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Назва */}
          <div className="form-field">
            <label className="form-label">Назва / Псевдонім</label>
            <input
              type="text"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="напр. Олексій, Новий рік..."
              className="text-input"
              disabled={isReadOnly}
            />
          </div>

          {/* Теги */}
          <div className="form-field">
            <label className="form-label">Теги</label>
            <div className="tags-input-wrapper">
              {formTags.map(tag => (
                <span key={tag} className="tag-chip" style={getTagColor(tag)}>
                  {tag}
                  {!isReadOnly && (
                    <button type="button" className="tag-remove" onClick={() => removeTag(tag)}>×</button>
                  )}
                </span>
              ))}
              {!isReadOnly && (
                <div className="tag-input-container">
                  <input
                    ref={tagInputRef}
                    type="text"
                    value={tagInput}
                    onChange={e => { setTagInput(e.target.value); setShowTagSuggestions(true); }}
                    onFocus={() => setShowTagSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowTagSuggestions(false), 150)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={formTags.length === 0 ? 'Додайте теги...' : ''}
                    className="tag-input"
                  />
                  {showTagSuggestions && tagSuggestions.length > 0 && (
                    <div className="tag-suggestions">
                      {tagSuggestions.map(tag => (
                        <button
                          key={tag}
                          type="button"
                          className="tag-suggestion-item"
                          onMouseDown={e => { e.preventDefault(); addTag(tag); }}
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

          {/* Примітки */}
          <div className="form-field">
            <label className="form-label">Примітки</label>
            <textarea
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              placeholder="Додаткова інформація..."
              className="text-input textarea"
              rows={3}
              disabled={isReadOnly}
            />
          </div>
        </div>

        <div className="modal-actions">
          {mode === 'view' ? (
            <>
              <Link className="btn btn-sm btn-analyze" to={`/mydate/${date?.date}`} onClick={onClose}>
                📊 Аналіз
              </Link>
              <button className="btn btn-secondary btn-sm" onClick={onSwitchToEdit}>
                ✏️ Редагувати
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                🗑 Видалити
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={submitting}>
                Скасувати
              </button>
              <button className="btn btn-sm" onClick={handleSave} disabled={!formDate || submitting}>
                {submitting ? 'Зберігаємо...' : mode === 'create' ? 'Додати' : 'Зберегти'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════ */

export function MyDatesPage({ onScenarioName }: { onScenarioName: (name: string | null) => void }) {
  const [dates, setDates] = useState<MyDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterTag, setFilterTag] = useState('all');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Accordion
  const [formOpen, setFormOpen] = useState(() => {
    try { return localStorage.getItem('mydates_form_open') === 'true'; } catch { return false; }
  });

  // Form state
  const [formDate, setFormDate] = useState('');
  const [formType, setFormType] = useState('person');
  const [formName, setFormName] = useState('');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formNotes, setFormNotes] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Modal
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [modalDate, setModalDate] = useState<MyDate | null>(null);

  // Row dropdown
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    if (openDropdown) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openDropdown]);

  useEffect(() => {
    onScenarioName('MyDate');
  }, [onScenarioName]);

  const userId = getTelegramUserId();

  // Fetch dates
  const fetchDates = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const res = await fetch('/api/my-dates', {
        headers: { 'X-Telegram-User-Id': String(userId) },
      });
      if (!res.ok) {
        const text = await res.text();
        setError(`Помилка ${res.status}: ${text.slice(0, 100)}`);
        return;
      }
      const data = await res.json();
      if (data.ok) {
        setDates(data.dates);
      } else {
        setError(data.error ?? 'Помилка завантаження');
      }
    } catch (e) {
      setError(`Помилка мережі: ${String(e).slice(0, 100)}`);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchDates(); }, [fetchDates]);

  // All unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    dates.forEach(d => (d.tags || []).forEach(t => tagSet.add(t)));
    return [...tagSet].sort();
  }, [dates]);

  // All unique types (built-in + custom)
  const allTypes = useMemo(() => {
    const builtins = ['person', 'event', 'other'];
    const custom = getCustomTypes(dates);
    return [...builtins, ...custom];
  }, [dates]);

  // Tag suggestions for accordion form
  const formTagSuggestions = useMemo(() => {
    if (!tagInput.trim()) return allTags.filter(t => !formTags.includes(t)).slice(0, 8);
    const search = tagInput.toLowerCase();
    return allTags.filter(t => t.toLowerCase().includes(search) && !formTags.includes(t)).slice(0, 8);
  }, [tagInput, allTags, formTags]);

  // Processed dates (filter + sort)
  const processedDates = useMemo(() => {
    let result = [...dates];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(d =>
        (d.name || '').toLowerCase().includes(q) ||
        (d.notes || '').toLowerCase().includes(q) ||
        (d.tags || []).some(t => t.toLowerCase().includes(q)) ||
        formatDate(d.date).includes(q)
      );
    }

    // Type filter
    if (filterType !== 'all') {
      result = result.filter(d => d.type === filterType);
    }

    // Tag filter
    if (filterTag !== 'all') {
      result = result.filter(d => (d.tags || []).includes(filterTag));
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortField) {
        case 'date':
          aVal = new Date(a.date).getTime();
          bVal = new Date(b.date).getTime();
          break;
        case 'created_at':
          aVal = a.created_at || '';
          bVal = b.created_at || '';
          break;
        case 'type':
          aVal = (a.type || '').toLowerCase();
          bVal = (b.type || '').toLowerCase();
          break;
        case 'tags':
          aVal = (a.tags || []).join(', ').toLowerCase();
          bVal = (b.tags || []).join(', ').toLowerCase();
          break;
        case 'notes':
          aVal = (a.notes || '').toLowerCase();
          bVal = (b.notes || '').toLowerCase();
          break;
        case 'name':
        default:
          aVal = (a.name || '').toLowerCase();
          bVal = (b.name || '').toLowerCase();
          break;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [dates, searchQuery, filterType, filterTag, sortField, sortOrder]);

  // Accordion toggle
  const toggleForm = () => {
    const next = !formOpen;
    setFormOpen(next);
    try { localStorage.setItem('mydates_form_open', String(next)); } catch {}
  };

  // Reset accordion form
  const resetForm = () => {
    setFormDate('');
    setFormType('person');
    setFormName('');
    setFormTags([]);
    setFormNotes('');
    setTagInput('');
  };

  // Add via accordion
  const handleAccordionAdd = async () => {
    if (!formDate || !userId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/my-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Telegram-User-Id': String(userId) },
        body: JSON.stringify({
          date: formDate,
          type: formType,
          name: formName,
          tags: formTags,
          notes: formNotes,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        resetForm();
        setFormOpen(false);
        try { localStorage.setItem('mydates_form_open', 'false'); } catch {}
        await fetchDates();
      } else {
        setError(data.error ?? 'Помилка додавання');
      }
    } catch (e) {
      setError(`Помилка мережі: ${String(e).slice(0, 100)}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Save from modal (create or edit)
  const handleModalSave = async (data: Partial<MyDate>) => {
    if (!userId) return;
    const isCreate = modalMode === 'create';
    const res = await fetch('/api/my-dates', {
      method: isCreate ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Telegram-User-Id': String(userId) },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (result.ok) {
      setModalMode(null);
      setModalDate(null);
      await fetchDates();
    } else {
      setError(result.error ?? 'Помилка збереження');
    }
  };

  // Delete single
  const handleDelete = async (id: string) => {
    if (!userId) return;
    const res = await fetch(`/api/my-dates?id=${id}`, {
      method: 'DELETE',
      headers: { 'X-Telegram-User-Id': String(userId) },
    });
    const data = await res.json();
    if (data.ok) {
      setModalMode(null);
      setModalDate(null);
      await fetchDates();
    } else {
      setError(data.error ?? 'Помилка видалення');
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Видалити ${selectedIds.size} дат(у)?`)) return;
    if (!userId) return;
    const ids = [...selectedIds].join(',');
    const res = await fetch(`/api/my-dates?ids=${ids}`, {
      method: 'DELETE',
      headers: { 'X-Telegram-User-Id': String(userId) },
    });
    const data = await res.json();
    if (data.ok) {
      setSelectedIds(new Set());
      await fetchDates();
    } else {
      setError(data.error ?? 'Помилка видалення');
    }
  };

  // Bulk compare
  const handleBulkCompare = () => {
    if (selectedIds.size < 2) return;
    const selectedDates = processedDates
      .filter(d => selectedIds.has(d.id))
      .map(d => d.date);
    window.location.href = `/mydate/compare/systems?dates=${encodeURIComponent(selectedDates.join(','))}`;
  };

  // Sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Selection
  const toggleAll = () => {
    if (selectedIds.size === processedDates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(processedDates.map(d => d.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Tag accordion helpers
  const addFormTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !formTags.includes(trimmed)) setFormTags([...formTags, trimmed]);
    setTagInput('');
    setShowTagSuggestions(false);
    tagInputRef.current?.focus();
  };

  const removeFormTag = (tag: string) => setFormTags(formTags.filter(t => t !== tag));

  const handleFormTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); if (tagInput.trim()) addFormTag(tagInput); }
    else if (e.key === 'Backspace' && !tagInput && formTags.length > 0) setFormTags(formTags.slice(0, -1));
  };

  return (
    <main>
      <section className="hero">
        <div className="page-header">
          <h1>Мої дати</h1>
          <span className="date-count">{processedDates.length} з {dates.length}</span>
        </div>

        {/* ═══ АКОРДЕОН: Додати дату ═══ */}
        <div className={`accordion ${formOpen ? 'open' : ''}`}>
          <button className="accordion-toggle" onClick={toggleForm}>
            <span className={`accordion-icon ${formOpen ? 'rotated' : ''}`}>▶</span>
            {formOpen ? 'Додати нову дату' : '＋ Додати дату'}
          </button>
          {formOpen && (
            <div className="accordion-content">
              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label">Дата *</label>
                  <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="date-input" />
                </div>
                <div className="form-field">
                  <label className="form-label">Тип</label>
                  <div className="type-selector">
                    {['person', 'event', 'other'].map(t => {
                      const cfg = getTypeConfig(t);
                      return (
                        <button key={t} type="button"
                          className={`type-chip ${formType === t ? 'active' : ''}`}
                          style={{ borderColor: formType === t ? cfg.color : '#e5e5e5', background: formType === t ? cfg.bg : '#fff', color: formType === t ? cfg.color : '#666' }}
                          onClick={() => setFormType(t)}
                        >
                          {cfg.emoji} {t === 'person' ? 'Людина' : t === 'event' ? 'Подія' : 'Інше'}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="form-field">
                  <label className="form-label">Назва / Псевдонім</label>
                  <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="напр. Олексій..." className="text-input" />
                </div>
                <div className="form-field full-width">
                  <label className="form-label">Теги</label>
                  <div className="tags-input-wrapper">
                    {formTags.map(tag => (
                      <span key={tag} className="tag-chip" style={getTagColor(tag)}>
                        {tag}
                        <button type="button" className="tag-remove" onClick={() => removeFormTag(tag)}>×</button>
                      </span>
                    ))}
                    <div className="tag-input-container">
                      <input ref={tagInputRef} type="text" value={tagInput}
                        onChange={e => { setTagInput(e.target.value); setShowTagSuggestions(true); }}
                        onFocus={() => setShowTagSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowTagSuggestions(false), 150)}
                        onKeyDown={handleFormTagKeyDown}
                        placeholder={formTags.length === 0 ? 'Додайте теги...' : ''} className="tag-input" />
                      {showTagSuggestions && formTagSuggestions.length > 0 && (
                        <div className="tag-suggestions">
                          {formTagSuggestions.map(tag => (
                            <button key={tag} type="button" className="tag-suggestion-item"
                              onMouseDown={e => { e.preventDefault(); addFormTag(tag); }}>
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
                  <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Додаткова інформація..." className="text-input textarea" rows={2} />
                </div>
              </div>
              <button className="btn btn-sm" onClick={handleAccordionAdd} disabled={!formDate || submitting}>
                {submitting ? 'Додаємо...' : 'Додати дату'}
              </button>
            </div>
          )}
        </div>

        {error && <p className="status-text error">{error}</p>}

        {/* ═══ ТАБЛИЦЯ ═══ */}
        {!loading && dates.length > 0 && (
          <>
            {/* Фільтри */}
            <div className="table-filters">
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="🔍 Пошук..." className="filter-search" />
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="filter-select">
                <option value="all">Усі типи</option>
                {allTypes.map(t => {
                  const cfg = getTypeConfig(t);
                  const label = t === 'person' ? 'Людина' : t === 'event' ? 'Подія' : t === 'other' ? 'Інше' : t;
                  return <option key={t} value={t}>{cfg.emoji} {label}</option>;
                })}
              </select>
              {allTags.length > 0 && (
                <select value={filterTag} onChange={e => setFilterTag(e.target.value)} className="filter-select">
                  <option value="all">Усі теги</option>
                  {allTags.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
            </div>

            {/* Bulk actions */}
            {selectedIds.size > 0 && (
              <div className="bulk-bar">
                <span className="bulk-count">Обрано: {selectedIds.size}</span>
                <button className="btn btn-sm btn-compare" onClick={handleBulkCompare} disabled={selectedIds.size < 2}>
                  📊 Співставити ({selectedIds.size})
                </button>
                <button className="btn btn-sm btn-danger" onClick={handleBulkDelete}>
                  🗑 Видалити ({selectedIds.size})
                </button>
                <button className="btn btn-sm btn-secondary" onClick={() => setSelectedIds(new Set())}>
                  Скасувати вибір
                </button>
              </div>
            )}

            {/* Таблиця */}
            <div className="table-wrap">
              <table className="dates-table">
                <thead>
                  <tr>
                    <th className="sticky-col-menu"></th>
                    <th className="sticky-col-check">
                      <input type="checkbox" checked={processedDates.length > 0 && selectedIds.size === processedDates.length}
                        onChange={toggleAll} className="row-checkbox" />
                    </th>
                    <th onClick={() => handleSort('name')} className="sortable sticky-col-name">
                      Назва {sortField === 'name' && <span className="sort-arrow">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                    </th>
                    <th onClick={() => handleSort('date')} className="sortable">
                      Дата {sortField === 'date' && <span className="sort-arrow">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                    </th>
                    <th onClick={() => handleSort('tags')} className="sortable">
                      Теги {sortField === 'tags' && <span className="sort-arrow">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                    </th>
                    <th onClick={() => handleSort('type')} className="sortable">
                      Тип {sortField === 'type' && <span className="sort-arrow">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                    </th>
                    <th onClick={() => handleSort('notes')} className="sortable">
                      Примітки {sortField === 'notes' && <span className="sort-arrow">{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {processedDates.map(d => {
                    const cfg = getTypeConfig(d.type);
                    const typeLabel = d.type === 'person' ? 'Людина' : d.type === 'event' ? 'Подія' : d.type === 'other' ? 'Інше' : d.type;
                    return (
                      <tr key={d.id} className={selectedIds.has(d.id) ? 'selected' : ''}>
                        <td className="sticky-col-menu">
                          <div className={`row-dropdown ${openDropdown === d.id ? 'open' : ''}`} ref={openDropdown === d.id ? dropdownRef : undefined}>
                            <button className="row-dropdown-toggle" onClick={(e) => {
                              e.stopPropagation();
                              const isOpen = openDropdown === d.id;
                              setOpenDropdown(isOpen ? null : d.id);
                              if (!isOpen) {
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                const menuEl = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement;
                                if (menuEl) {
                                  menuEl.style.top = rect.bottom + 2 + 'px';
                                  menuEl.style.left = Math.min(rect.left, window.innerWidth - 170) + 'px';
                                }
                              }
                            }}>⋮</button>
                            <div className="row-dropdown-menu">
                              <Link className="row-dropdown-item" to={`/mydate/${d.date}`} onClick={() => setOpenDropdown(null)}>📊 Аналіз</Link>
                              <button className="row-dropdown-item" onClick={() => { setModalMode('view'); setModalDate(d); setOpenDropdown(null); }}>👁 Переглянути</button>
                              <button className="row-dropdown-item" onClick={() => { setModalMode('edit'); setModalDate(d); setOpenDropdown(null); }}>✏️ Редагувати</button>
                              <button className="row-dropdown-item danger" onClick={() => { handleDelete(d.id); setOpenDropdown(null); }}>🗑 Видалити</button>
                            </div>
                          </div>
                        </td>
                        <td className="sticky-col-check">
                          <input type="checkbox" checked={selectedIds.has(d.id)}
                            onChange={() => toggleSelect(d.id)} className="row-checkbox" />
                        </td>
                        <td className="sticky-col-name name-cell">{d.name || '—'}</td>
                        <td className="date-cell">{formatDateShort(d.date)}</td>
                        <td className="tags-cell">
                          {(d.tags || []).length > 0 ? (
                            <div className="tags-inline">
                              {d.tags.map(tag => (
                                <span key={tag} className="tag-chip tag-chip--sm" style={getTagColor(tag)}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="no-tags">—</span>
                          )}
                        </td>
                        <td className="type-cell">
                          <span className="type-badge" style={{ color: cfg.color, background: cfg.bg }}>
                            {cfg.emoji} {typeLabel}
                          </span>
                        </td>
                        <td className="notes-cell" title={d.notes || ''}>{d.notes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {loading && <p className="status-text">Завантажуємо...</p>}
        {!loading && dates.length === 0 && (
          <p className="status-text">Поки що немає жодної дати. Додайте першу!</p>
        )}
        {!loading && dates.length > 0 && processedDates.length === 0 && (
          <p className="status-text">Нічого не знайдено за фільтром</p>
        )}

        {/* Кнопка "Нова дата" внизу */}
        {dates.length > 0 && !formOpen && (
          <button className="btn btn-add-bottom" onClick={() => { setModalMode('create'); setModalDate(null); }}>
            ＋ Нова дата
          </button>
        )}

        {/* ═══ МОДАЛЬНЕ ВІКНО ═══ */}
        {modalMode && (
          <DateModal
            mode={modalMode}
            date={modalDate}
            allTags={allTags}
            onClose={() => { setModalMode(null); setModalDate(null); }}
            onSave={handleModalSave}
            onDelete={handleDelete}
            onSwitchToEdit={() => setModalMode('edit')}
          />
        )}
      </section>
    </main>
  );
}
