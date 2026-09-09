/**
 * Page Builder — DateAnalysisBlock.
 *
 * Single-date analysis with system cards.
 * Replaces the hardcoded MydateResultPage.
 *
 * Reads the date from URL path segment (e.g., /mydate/2024-01-01)
 * or from props. Fetches available systems and shows analysis results.
 *
 * @module packages/ui/src/blocks/DateAnalysisBlock
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

// ── Types ─────────────────────────────────────────────────────────

interface SystemParameter {
  key: string;
  label: string;
}

interface SystemCard {
  id: string;
  name: string;
  description: string;
  implemented: boolean;
  parameters?: SystemParameter[];
}

interface SystemResult {
  parameters: { key: string; label: string; value: string }[];
  comingSoon: string[];
}

// ── API helpers ───────────────────────────────────────────────────

async function fetchSystems(): Promise<SystemCard[]> {
  const res = await fetch("/api/mydate/systems");
  const data = await res.json();
  return data?.ok ? data.systems : [];
}

async function analyzeDate(date: string, systemId: string): Promise<SystemResult> {
  const res = await fetch("/api/mydate/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, systemId }),
  });
  const data = await res.json();
  if (!data?.ok) throw new Error(data?.error ?? "Помилка аналізу");
  return data.result;
}

async function fetchAnalysis(date: string): Promise<Record<string, SystemResult>> {
  const res = await fetch(`/api/mydate/analysis/${date}`);
  const data = await res.json();
  return data?.ok ? data.systems : {};
}

// ── Helpers ───────────────────────────────────────────────────────

function formatDate(raw: string): string {
  const parts = raw.split("-");
  if (parts.length !== 3) return raw;
  const [yyyy, mm, dd] = parts;
  return `${dd}.${mm}.${yyyy}`;
}

function isValidDate(raw: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(raw);
}

// ── System Card View ──────────────────────────────────────────────

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

  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    try {
      const res = await analyzeDate(date, system.id);
      onAnalyzed(system.id, res);
    } finally {
      setLoading(false);
    }
  }, [date, system.id, onAnalyzed]);

  return (
    <div
      style={{
        padding: "var(--sp-5)",
        background: "var(--bg-1, var(--bg-home, #f0f2f5))",
        border: "1px solid var(--border-subtle, #e2e8f0)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <h3 style={{ margin: "0 0 var(--sp-3) 0" }}>{system.name}</h3>

      {result ? (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
            {result.parameters.map((p) => (
              <div
                key={p.key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "var(--sp-2) 0",
                  borderBottom: "1px solid var(--border-subtle, #e2e8f0)",
                }}
              >
                <span className="wb-text-sm">{p.label}</span>
                <strong className="wb-text-sm">{p.value}</strong>
              </div>
            ))}
          </div>
          {result.comingSoon.length > 0 && (
            <p className="wb-text-xs wb-text-muted" style={{ marginTop: "var(--sp-3)" }}>
              Скоро підключимо: {result.comingSoon.join(", ")}
            </p>
          )}
        </div>
      ) : (
        <div>
          <p className="wb-text-sm wb-text-muted">{system.description}</p>
          {system.implemented && (
            <button
              className="wb-btn wb-btn-primary"
              onClick={handleAnalyze}
              disabled={loading}
              style={{ marginTop: "var(--sp-3)" }}
            >
              {loading ? "Аналізуємо..." : "Проаналізувати"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Block Component ──────────────────────────────────────────

export function DateAnalysisBlock({ block }: BlockComponentProps) {
  const {
    title = "Аналіз дати",
    dateSource = "url",
    customDate = "",
    backUrl = "/mydate",
  } = block.props as {
    title?: string;
    dateSource?: string;
    customDate?: string;
    backUrl?: string;
  };

  // Determine date
  const date = useMemo(() => {
    if (dateSource === "custom" && customDate) return customDate;

    // From URL path: /mydate/2024-01-01
    const pathParts = window.location.pathname.split("/");
    const lastSegment = pathParts[pathParts.length - 1] ?? "";
    if (isValidDate(lastSegment)) return lastSegment;

    // From URL query
    const params = new URLSearchParams(window.location.search);
    const fromParam = params.get("date");
    if (fromParam && isValidDate(fromParam)) return fromParam;

    return null;
  }, [dateSource, customDate]);

  const [systems, setSystems] = useState<SystemCard[] | null>(null);
  const [analysis, setAnalysis] = useState<Record<string, SystemResult>>({});

  useEffect(() => {
    if (!date || !isValidDate(date)) return;
    fetchSystems().then((sys) => setSystems(sys));
    fetchAnalysis(date).then((a) => setAnalysis(a));
  }, [date]);

  const handleAnalyzed = useCallback((systemId: string, result: SystemResult) => {
    setAnalysis((prev) => ({ ...prev, [systemId]: result }));
  }, []);

  // Invalid date
  if (!date || !isValidDate(date)) {
    return (
      <div className="wb-block-date-analysis">
        <p className="wb-text-muted">Невірний формат дати.</p>
        <a className="wb-btn wb-btn-secondary" href={backUrl}>
          Спробувати ще раз
        </a>
      </div>
    );
  }

  return (
    <div className="wb-block-date-analysis">
      <h2>{title}</h2>
      <p className="wb-text-sm wb-text-muted" style={{ marginBottom: "var(--sp-4)" }}>
        Ви вказували дату: <strong>{formatDate(date)}</strong>
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "var(--sp-4)",
        }}
      >
        {(systems ?? []).map((s) => (
          <SystemCardView
            key={s.id}
            system={s}
            date={date}
            result={analysis[s.id]}
            onAnalyzed={handleAnalyzed}
          />
        ))}
      </div>

      {systems === null && (
        <p className="wb-text-sm wb-text-muted">Завантажуємо системи...</p>
      )}
    </div>
  );
}
