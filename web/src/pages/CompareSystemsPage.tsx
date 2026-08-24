import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface SystemDef {
  id: string;
  name: string;
  description: string;
  implemented: boolean;
  parameters: { key: string; label: string }[];
}

export function CompareSystemsPage({ onScenarioName }: { onScenarioName: (name: string | null) => void }) {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const [systems, setSystems] = useState<SystemDef[]>([]);
  const [selected, setSelected] = useState<Record<string, Record<string, boolean>>>({});

  const dates = useMemo(
    () => (search.get('dates') ?? '').split(',').filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)),
    [search]
  );

  useEffect(() => {
    onScenarioName('MyDate');
    fetch('/api/mydate/systems')
      .then((r) => r.json())
      .then((data) => {
        const list: SystemDef[] = data?.ok ? data.systems : [];
        setSystems(list);
        const init: Record<string, Record<string, boolean>> = {};
        for (const s of list) {
          if (!s.implemented) continue;
          init[s.id] = {};
          for (const p of s.parameters ?? []) init[s.id][p.key] = true;
        }
        setSelected(init);
      });
  }, [onScenarioName]);

  const isSystemSelected = (id: string) => Object.values(selected[id] ?? {}).some(Boolean);

  const toggleSystem = (id: string, value: boolean) => {
    setSelected((prev) => {
      const next = { ...prev, [id]: { ...(prev[id] ?? {}) } };
      const sys = systems.find((s) => s.id === id);
      for (const p of sys?.parameters ?? []) next[id][p.key] = value;
      return next;
    });
  };

  const toggleParam = (id: string, key: string, value: boolean) => {
    setSelected((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), [key]: value } }));
  };

  const compare = () => {
    if (dates.length === 0) return;
    const sys = systems
      .filter((s) => s.implemented && isSystemSelected(s.id))
      .map((s) => s.id);
    const prm = Array.from(
      new Set(
        systems.flatMap((s) =>
          (s.parameters ?? []).filter((p) => selected[s.id]?.[p.key]).map((p) => p.key)
        )
      )
    );
    const qs = new URLSearchParams();
    if (sys.length) qs.set('sys', sys.join(','));
    if (prm.length) qs.set('p', prm.join(','));
    navigate(`/mydate/${dates.join('+')}?${qs.toString()}`);
  };

  if (dates.length === 0) {
    return (
      <main>
        <section className="hero">
          <p style={{ fontSize: '18px', color: '#4a4a4a' }}>Не знайдено дат для аналізу.</p>
          <a className="btn" href="/mydate/compare">Назад до введення дат</a>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="hero">
        <h1>Оберіть системи та параметри</h1>
        <p className="hint">Дат для співставлення: {dates.length}</p>

        <div className="sys-select">
          {systems.map((s) => (
            <div key={s.id} className="sys-group">
              <label className="sys-title">
                <input
                  type="checkbox"
                  checked={s.implemented && isSystemSelected(s.id)}
                  disabled={!s.implemented}
                  onChange={(e) => toggleSystem(s.id, e.target.checked)}
                />
                <strong>{s.name}</strong>
                {!s.implemented && <em> (скоро)</em>}
              </label>
              {s.implemented && (
                <div className="sys-params">
                  {(s.parameters ?? []).map((p) => (
                    <label key={p.key} className="sys-param">
                      <input
                        type="checkbox"
                        checked={!!selected[s.id]?.[p.key]}
                        onChange={(e) => toggleParam(s.id, p.key, e.target.checked)}
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <button className="btn" onClick={compare} disabled={!systems.some((s) => s.implemented && isSystemSelected(s.id))}>
          Співставити
        </button>
      </section>
    </main>
  );
}
