import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

interface SystemCard {
  id: string;
  name: string;
  description: string;
}

function formatDate(raw: string): string {
  const parts = raw.split('-');
  if (parts.length !== 3) return raw;
  const [dd, mm, yyyy] = parts;
  return `${dd}.${mm}.${yyyy}`;
}

function isValidDate(raw: string): boolean {
  return /^\d{2}-\d{2}-\d{4}$/.test(raw);
}

export function MydateResultPage({ onScenarioName }: { onScenarioName: (name: string | null) => void }) {
  const { date } = useParams<{ date: string }>();
  const [systems, setSystems] = useState<SystemCard[] | null>(null);

  useEffect(() => {
    onScenarioName('MyDate');
    fetch('/api/mydate/systems')
      .then((r) => r.json())
      .then((data) => setSystems(data?.ok ? data.systems : []))
      .catch(() => setSystems([]));
  }, [onScenarioName]);

  if (!date || !isValidDate(date)) {
    return (
      <main>
        <section className="hero">
          <p style={{ fontSize: '18px', color: '#4a4a4a' }}>Невірний формат дати.</p>
          <a className="btn" href="/mydate">Спробувати ще раз</a>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="hero">
        <p style={{ fontSize: '18px', color: '#4a4a4a', marginBottom: '24px' }}>
          Ви вказували дату: {formatDate(date)}
        </p>
        <div className="cards-grid">
          {(systems ?? []).map((s) => (
            <div className="card" key={s.id}>
              <h3>{s.name}</h3>
              <p>{s.description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
