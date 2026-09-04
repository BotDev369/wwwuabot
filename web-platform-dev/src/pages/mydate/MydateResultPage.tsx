import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppStore } from "@/stores/app.store";
import {
  fetchSystems,
  analyzeDate,
  fetchAnalysis,
  type SystemCard,
  type SystemResult,
} from "@/shared/api/mydate.api";
import { CompareTablePage } from "./CompareTablePage";

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

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const res = await analyzeDate(date, system.id);
      onAnalyzed(system.id, res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wb-card">
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
            <button className="wb-btn" onClick={handleAnalyze} disabled={loading}>
              {loading ? "Аналізуємо..." : "Проаналізувати"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function MydateResultPage() {
  const setScenarioName = useAppStore((s) => s.setScenarioName);
  const { date } = useParams<{ date: string }>();
  const [systems, setSystems] = useState<SystemCard[] | null>(null);
  const [analysis, setAnalysis] = useState<Record<string, SystemResult>>({});

  useEffect(() => {
    if (!date || !isValidDate(date)) return;
    setScenarioName("MyDate");

    fetchSystems().then((sys) => setSystems(sys));
    fetchAnalysis(date).then((a) => setAnalysis(a));
  }, [date, setScenarioName]);

  // If URL contains +, it's a comparison
  if (date && date.includes("+")) {
    return <CompareTablePage />;
  }

  if (!date || !isValidDate(date)) {
    return (
      <main>
        <section className="hero">
          <p className="hero-text">Невірний формат дати.</p>
          <a className="wb-btn" href="/mydate">
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
        <div className="wb-cards-grid">
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
