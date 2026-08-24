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
  // Telegram WebApp SDK
  const tg = (window as any).Telegram?.WebApp;
  if (tg?.initDataUnsafe?.user?.id) {
    return tg.initDataUnsafe.user.id;
  }
  // Fallback: зчитуємо з URL params (для тестування)
  const params = new URLSearchParams(window.location.search);
  const uid = params.get('user_id');
  if (uid) return parseInt(uid, 10);
  return null;
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

  // форма додавання
  const [formDate, setFormDate] = useState('');
  const [formAlias, setFormAlias] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const userId = getTelegramUserId();

  useEffect(() => {
    onScenarioName('MyDate');
  }, [onScenarioName]);

  const fetchDates = useCallback(async () => {
    if (!userId) {
      setError('Не вдалося визначити користувача. Відкрийте через Telegram бот.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/my-dates', {
        headers: { 'X-Telegram-User-Id': String(userId) },
      });
      const data = await res.json();
      if (data.ok) {
        setDates(data.dates);
      } else {
        setError(data.error ?? 'Помилка завантаження');
      }
    } catch {
      setError('Помилка мережі');
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
    } catch {
      setError('Помилка мережі');
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

  if (!userId) {
    return (
      <main>
        <section className="hero">
          <h1>Мої дати</h1>
          <p className="hero-text">
            Щоб користуватися цією сторінкою, авторизуйтесь через Telegram.
          </p>
          <a
            className="btn btn-telegram"
            href="https://t.me/wwwuabot?start=mydate_%D0%B0%D0%B2%D1%82%D0%BE%D1%80%D0%B8%D0%B7%D0%B0%D1%86%D1%96%D1%8F"
            target="_blank"
            rel="noopener noreferrer"
          >
            ✈ Авторизуватись Telegram
          </a>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="hero">
        <h1>Мої дати</h1>

        {/* Форма додавання */}
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

        {/* Список дат */}
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
