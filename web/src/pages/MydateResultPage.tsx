import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CompareTablePage } from "./CompareTablePage";

interface SystemCard {
  id: string;
  name: string;
  description: string;
  implemented: boolean;
}

interface SystemResult {
  parameters: { key: string; label: string; value: string }[];
  comingSoon: string[];
}

function formatDate(raw: string): string {
  const parts = raw.split("-");
  if (parts.length !== 3) return raw;
  const [yyyy, mm, dd] = parts;
  return `${dd}.${mm}.${yyyy}`;
}

function isValidDate(raw: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(raw);
}

function SystemCardView({
  system,
  date,
  result,
  onAnalyzed,
}: {
  system: SystemCard;
  date: string;
  result: SystemResult | undefined;
  onAnalyzed: (systemId: string, result: SystemResult) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleAnalyze = () => {
    setLoading(true);
    fetch("/api/mydate/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, systemId: system.id }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok) onAnalyzed(system.id, data.result);
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="card">
      <h3>{system.name}</h3>
      {result ? (
        <>
          <ul className="param-list">
            {result.parameters.map((p) => (
              <li className="param-row" key={p.key}>
                <span>{p.label}</span>
                <strong>{p.value}</strong>
              </li>
            ))}
          </ul>
          {result.comingSoon.length > 0 && (
            <p className="coming-soon">Скоро підключимо: {result.comingSoon.join(", ")}</p>
          )}
        </>
      ) : (
        <>
          <p>{system.description}</p>
          {system.implemented && (
            <button className="btn" onClick={handleAnalyze} disabled={loading}>
              {loading ? "Аналізуємо..." : "Проаналізувати"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function MydatePage({ onScenarioName }: { onScenarioName: (name: string | null) => void }) {
  const { date } = useParams<{ date: string }>();
  if (date && date.includes("+")) {
    return <CompareTablePage onScenarioName={onScenarioName} />;
  }
  return <MydateResultPage onScenarioName={onScenarioName} />;
}

export function MydateResultPage({
  onScenarioName,
}: {
  onScenarioName: (name: string | null) => void;
}) {
  const { date } = useParams<{ date: string }>();
  const [systems, setSystems] = useState<SystemCard[] | null>(null);
  const [analysis, setAnalysis] = useState<Record<string, SystemResult>>({});

  useEffect(() => {
    if (!date || !isValidDate(date)) return;
    onScenarioName("MyDate");
    fetch("/api/mydate/systems")
      .then((r) => r.json())
      .then((data) => setSystems(data?.ok ? data.systems : []));
    fetch(`/api/mydate/analysis/${date}`)
      .then((r) => r.json())
      .then((data) => setAnalysis(data?.ok ? data.systems : {}));
  }, [date, onScenarioName]);

  if (!date || !isValidDate(date)) {
    return (
      <main>
        <section className="hero">
          <p className="hero-text">Невірний формат дати.</p>
          <a className="btn" href="/mydate">
            Спробувати ще раз
          </a>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="hero">
        <p className="hero-text">Ви вказували дату: {formatDate(date)}</p>
        <div className="cards-grid">
          {(systems ?? []).map((s) => (
            <SystemCardView
              system={s}
              date={date}
              result={analysis[s.id]}
              onAnalyzed={(id, result) => setAnalysis((prev) => ({ ...prev, [id]: result }))}
              key={s.id}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
