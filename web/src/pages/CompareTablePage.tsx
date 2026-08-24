import { Fragment, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

interface SystemDef {
  id: string;
  name: string;
  implemented: boolean;
  parameters: { key: string; label: string }[];
}

function formatDate(raw: string): string {
  const parts = raw.split('-');
  if (parts.length !== 3) return raw;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

export function CompareTablePage({ onScenarioName }: { onScenarioName: (name: string | null) => void }) {
  const { date: dateParam } = useParams<{ date: string }>();
  const [search] = useSearchParams();
  const [systems, setSystems] = useState<SystemDef[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Record<string, Record<string, string>>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dates = useMemo(
    () => (dateParam ?? '').split('+').filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)),
    [dateParam]
  );

  const selectedSystems = useMemo(
    () => (search.get('sys') ?? '').split(',').filter(Boolean),
    [search]
  );
  const selectedParams = useMemo(
    () => (search.get('p') ?? '').split(',').filter(Boolean),
    [search]
  );

  useEffect(() => {
    onScenarioName('MyDate');
    if (dates.length === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch('/api/mydate/systems')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.ok) setSystems(data.systems);
      })
      .then(() =>
        fetch('/api/mydate/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dates,
            systemIds: selectedSystems.length ? selectedSystems : undefined,
            parameterKeys: selectedParams.length ? selectedParams : undefined,
          }),
        })
      )
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.ok) setMatrix(data.matrix);
        else setError(data?.error ?? 'Помилка співставлення');
      })
      .catch(() => {
        if (!cancelled) setError('Помилка мережі');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dates, selectedSystems, selectedParams, onScenarioName]);

  const rows = useMemo(() => {
    const systemIds = selectedSystems.length
      ? systems.filter((s) => selectedSystems.includes(s.id) && s.implemented)
      : systems;
    const out: { systemId: string; systemName: string; key: string; label: string }[] = [];
    for (const s of systemIds) {
      const params = (s.parameters ?? []).filter((p) => !selectedParams.length || selectedParams.includes(p.key));
      for (const p of params) out.push({ systemId: s.id, systemName: s.name, key: p.key, label: p.label });
    }
    return out;
  }, [systems, selectedSystems, selectedParams]);

  if (dates.length === 0) {
    return (
      <main>
        <section className="hero">
          <p className="hero-text">Невірний формат дат у посиланні.</p>
          <a className="btn" href="/mydate/compare">Співставити дати</a>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="hero">
        <h1>Співставлення дат</h1>
        <p className="hint">Прокручуйте таблицю горизонтально, щоб бачити всі дати.</p>

        {loading && <p className="status-text">Аналізуємо...</p>}
        {error && <p className="status-text error">{error}</p>}

        {!loading && !error && (
          <div className="table-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th className="corner">Система / параметр</th>
                  {dates.map((d) => (
                    <th key={d}>{formatDate(d)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const showSystemHeader = idx === 0 || rows[idx - 1].systemId !== r.systemId;
                  return (
                    <Fragment key={`${r.systemId}-${r.key}`}>
                      {showSystemHeader && (
                        <tr className="system-row">
                          <td className="system-name">{r.systemName}</td>
                          {dates.map((d) => (
                            <td key={d} className="system-fill" />
                          ))}
                        </tr>
                      )}
                      <tr>
                        <td className="param-cell">{r.label}</td>
                        {dates.map((d) => {
                          const value = matrix[d]?.[r.systemId]?.[r.key];
                          return (
                            <td key={d} className="value-cell">
                              {value ?? '—'}
                            </td>
                          );
                        })}
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
