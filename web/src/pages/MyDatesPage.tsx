import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';

interface MyDate {
  id: string;
  user_id: number;
  date: string;
  alias: string;
  category: string;
  notes: string;
  created_at: string;
}

type SortField = 'date' | 'alias' | 'category' | 'created_at';
type SortOrder = 'asc' | 'desc';

interface FilterState {
  field: SortField | 'all';
  value: string;
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

export function MyDatesPage({ onScenarioName }: { onScenarioName: (name: string | null) => void }) {
  const [dates, setDates] = useState<MyDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formDate, setFormDate] = useState('');
  const [formAlias, setFormAlias] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Filtering state
  const [filter, setFilter] = useState<FilterState>({ field: 'all', value: '' });
  const [showFilters, setShowFilters] = useState(false);

  // Edit modal state
  const [editingDate, setEditingDate] = useState<MyDate | null>(null);
  const [editForm, setEditForm] = useState({ date: '', alias: '', category: '', notes: '' });

  useEffect(() => {
    onScenarioName('MyDate');
  }, [onScenarioName]);

  const userId = getTelegramUserId();

  const fetchDates = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
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

  useEffect(() => {
    fetchDates();
  }, [fetchDates]);

  // Sort and filter dates client-side
  const processedDates = useMemo(() => {
    let result = [...dates];

    // Filter
    if (filter.field !== 'all' && filter.value.trim()) {
      const searchValue = filter.value.toLowerCase().trim();
      result = result.filter((d) => {
        const fieldValue = String(d[filter.field] ?? '').toLowerCase();
        return fieldValue.includes(searchValue);
      });
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'date' || sortField === 'created_at') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else {
        aVal = String(aVal ?? '').toLowerCase();
        bVal = String(bVal ?? '').toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [dates, sortField, sortOrder, filter]);

  const handleAdd = async () => {
    if (!formDate || !userId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/my-dates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-User-Id': String(userId),
        },
        body: JSON.stringify({
          date: formDate,
          alias: formAlias,
          category: formCategory,
          notes: formNotes,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        setError(`Помилка ${res.status}: ${text.slice(0, 100)}`);
        return;
      }
      const data = await res.json();
      if (data.ok) {
        setFormDate('');
        setFormAlias('');
        setFormCategory('');
        setFormNotes('');
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

  const handleDelete = async (id: string) => {
    if (!userId) return;
    if (!confirm('Видалити цю дату?')) return;
    try {
      const res = await fetch(`/api/my-dates?id=${id}`, {
        method: 'DELETE',
        headers: { 'X-Telegram-User-Id': String(userId) },
      });
      const data = await res.json();
      if (data.ok) {
        await fetchDates();
      } else {
        setError(data.error ?? 'Помилка видалення');
      }
    } catch {
      setError('Помилка мережі');
    }
  };

  const handleEditOpen = (date: MyDate) => {
    setEditingDate(date);
    setEditForm({
      date: date.date,
      alias: date.alias,
      category: date.category,
      notes: date.notes,
    });
  };

  const handleEditSave = async () => {
    if (!editingDate || !userId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/my-dates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-User-Id': String(userId),
        },
        body: JSON.stringify({
          id: editingDate.id,
          date: editForm.date,
          alias: editForm.alias,
          category: editForm.category,
          notes: editForm.notes,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setEditingDate(null);
        await fetchDates();
      } else {
        setError(data.error ?? 'Помилка оновлення');
      }
    } catch {
      setError('Помилка мережі');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCancel = () => {
    setEditingDate(null);
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const handleSortFieldChange = (field: SortField) => {
    if (sortField === field) {
      toggleSortOrder();
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const clearFilter = () => {
    setFilter({ field: 'all', value: '' });
  };

  const hasActiveFilter = filter.field !== 'all' && filter.value.trim() !== '';

  return (
    <main>
      <section className="hero">
        <h1>Мої дати</h1>

        <div className="my-dates-form">
          <h3 className="form-title">Додати нову дату</h3>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Дата *</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="date-input"
              />
            </div>
            <div className="form-field">
              <label className="form-label">Псевдонім</label>
              <input
                type="text"
                value={formAlias}
                onChange={(e) => setFormAlias(e.target.value)}
                placeholder="напр. День народження"
                className="text-input"
              />
            </div>
            <div className="form-field">
              <label className="form-label">Категорія</label>
              <input
                type="text"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                placeholder="напр. Свято"
                className="text-input"
              />
            </div>
            <div className="form-field full-width">
              <label className="form-label">Примітки</label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Додаткова інформація..."
                className="text-input textarea"
                rows={2}
              />
            </div>
          </div>
          <button
            className="btn"
            onClick={handleAdd}
            disabled={!formDate || submitting}
          >
            {submitting ? 'Додаємо...' : 'Додати дату'}
          </button>
        </div>

        {error && <p className="status-text error">{error}</p>}

        {/* Sorting & Filtering Controls */}
        {dates.length > 0 && (
          <div className="my-dates-toolbar">
            <div className="toolbar-group sort-group">
              <label className="toolbar-label">Сортувати:</label>
              <div className="sort-controls">
                <select
                  value={sortField}
                  onChange={(e) => handleSortFieldChange(e.target.value as SortField)}
                  className="sort-select"
                >
                  <option value="date">Дата</option>
                  <option value="alias">Псевдонім</option>
                  <option value="category">Категорія</option>
                  <option value="created_at">Додано</option>
                </select>
                <button
                  type="button"
                  onClick={toggleSortOrder}
                  className="sort-order-btn"
                  aria-label={sortOrder === 'asc' ? 'За зростанням' : 'За спаданням'}
                >
                  {sortOrder === 'asc' ? '↑ А-Я' : '↓ Я-А'}
                </button>
              </div>
            </div>

            <div className="toolbar-group filter-group">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`toolbar-btn filter-toggle ${showFilters ? 'active' : ''}`}
              >
                Фільтр {hasActiveFilter ? '✓' : ''}
              </button>

              {showFilters && (
                <div className="filter-controls">
                  <select
                    value={filter.field}
                    onChange={(e) => setFilter({ ...filter, field: e.target.value as FilterState['field'] })}
                    className="filter-field-select"
                  >
                    <option value="all">Усі поля</option>
                    <option value="alias">Псевдонім</option>
                    <option value="category">Категорія</option>
                    <option value="notes">Примітки</option>
                  </select>
                  <input
                    type="text"
                    value={filter.value}
                    onChange={(e) => setFilter({ ...filter, value: e.target.value })}
                    placeholder="Значення для пошуку..."
                    className="filter-value-input"
                  />
                  {hasActiveFilter && (
                    <button type="button" onClick={clearFilter} className="btn btn-sm btn-clear-filter">
                      Скинути
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <p className="status-text">Завантажуємо...</p>
        ) : processedDates.length === 0 ? (
          <p className="status-text">
            {dates.length === 0 ? 'Поки що немає жодної дати. Додайте першу!' : 'Нічого не знайдено за фільтром'}
          </p>
        ) : (
          <div className="my-dates-list">
            {processedDates.map((d) => (
              <div key={d.id} className="my-date-card">
                <div className="my-date-card-header">
                  <span className="my-date-value">{formatDate(d.date)}</span>
                  {d.alias && <span className="my-date-alias">{d.alias}</span>}
                </div>
                {d.category && <span className="my-date-category">{d.category}</span>}
                {d.notes && <p className="my-date-notes">{d.notes}</p>}

                <div className="my-date-card-actions">
                  <Link className="btn btn-sm btn-analyze" to={`/mydate/${d.date}`}>
                    Аналіз дати
                  </Link>
                  <Link className="btn btn-sm btn-compare" to={`/compare/${d.date}`}>
                    Співставити
                  </Link>

                  <div className="dropdown">
                    <button className="icon-btn dropdown-toggle" aria-label="Дії" aria-expanded="false">
                      ⋮
                    </button>
                    <div className="dropdown-menu">
                      <button
                        className="dropdown-item"
                        onClick={() => handleEditOpen(d)}
                      >
                        ✏️ Змінити
                      </button>
                      <button
                        className="dropdown-item danger"
                        onClick={() => handleDelete(d.id)}
                      >
                        🗑 Видалити
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        {editingDate && (
          <div className="modal-overlay" onClick={handleEditCancel}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Редагувати дату</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label">Дата *</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="date-input"
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Псевдонім</label>
                  <input
                    type="text"
                    value={editForm.alias}
                    onChange={(e) => setEditForm({ ...editForm, alias: e.target.value })}
                    className="text-input"
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Категорія</label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="text-input"
                  />
                </div>
                <div className="form-field full-width">
                  <label className="form-label">Примітки</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="text-input textarea"
                    rows={2}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={handleEditCancel}>
                  Скасувати
                </button>
                <button className="btn" onClick={handleEditSave} disabled={!editForm.date || submitting}>
                  {submitting ? 'Зберігаємо...' : 'Зберегти'}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}