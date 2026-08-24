import { useEffect, useState, useCallback } from 'react';
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

        {loading ? (
          <p className="status-text">Завантажуємо...</p>
        ) : dates.length === 0 ? (
          <p className="status-text">Поки що немає жодної дати. Додайте першу!</p>
        ) : (
          <div className="my-dates-list">
            {dates.map((d) => (
              <div key={d.id} className="my-date-card">
                <div className="my-date-card-header">
                  <span className="my-date-value">{formatDate(d.date)}</span>
                  {d.alias && <span className="my-date-alias">{d.alias}</span>}
                </div>
                {d.category && (
                  <span className="my-date-category">{d.category}</span>
                )}
                {d.notes && (
                  <p className="my-date-notes">{d.notes}</p>
                )}
                <div className="my-date-card-actions">
                  <Link className="btn btn-sm btn-analyze" to={`/mydate/${d.date}`}>
                    Аналізувати
                  </Link>
                  <button
                    className="icon-btn danger"
                    onClick={() => handleDelete(d.id)}
                    aria-label="Видалити"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
