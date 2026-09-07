/**
 * Page Builder — CompareTableBlock.
 *
 * Comparison results matrix for multiple dates across selected systems.
 * Replaces the hardcoded CompareTablePage.
 *
 * Reads dates from URL params (date segment: /date1+date2+...),
 * system/parameter filters from query params, fetches comparison data.
 *
 * @module packages/ui/src/blocks/CompareTableBlock
 */

import { Fragment, useState, useEffect, useMemo } from "react";
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

// ── API helpers ───────────────────────────────────────────────────

async function fetchSystems(): Promise<SystemCard[]> {
  const res = await fetch("/api/mydate/systems");
  const data = await res.json();
  return data?.ok ? data.systems : [];
}

async function compareDates(
  dates: string[],
  systemIds?: string[],
  parameterKeys?: string[],
): Promise<Record<string, Record<string, Record<string, string>>>> {
  const res = await fetch("/api/mydate/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dates, systemIds, parameterKeys }),
  });
  const data = await res.json();
  if (!data?.ok) throw new Error(data?.error ?? "Помилка співставлення");
  return data.matrix;
}

// ── Helpers ───────────────────────────────────────────────────────

function formatDate(raw: string): string {
  const parts = raw.split("-");
  if (parts.length !== 3) return raw;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

// ── Main Block Component ──────────────────────────────────────────

export function CompareTableBlock({ block }: BlockComponentProps) {
  const {
    title = "Співставлення дат",
    backUrl = "/mydate/compare",
    paramKey = "dates",
    systemKey = "sys",
    parameterKey = "p",
  } = block.props as {
    title?: string;
    backUrl?: string;
    paramKey?: string;
    systemKey?: string;
    parameterKey?: string;
  };

  // Parse dates from URL path segment: /date1+date2+date3
  const dates = useMemo(() => {
    // Try to get from URL path (e.g., /mydate/2024-01-01+2024-02-02)
    const pathParts = window.location.pathname.split("/");
    const lastSegment = pathParts[pathParts.length - 1] ?? "";
    if (lastSegment.includes("+")) {
      return lastSegment.split("+").filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
    }
    // Fallback: query param
    const params = new URLSearchParams(window.location.search);
    const raw = params.get(paramKey) ?? "";
    return raw.split(",").filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  }, [paramKey]);

  const selectedSystems = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get(systemKey) ?? "").split(",").filter(Boolean);
  }, [systemKey]);

  const selectedParams = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get(parameterKey) ?? "").split(",").filter(Boolean);
  }, [parameterKey]);

  const [systems, setSystems] = useState<SystemCard[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Record<string, Record<string, string>>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    if (dates.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSystems()
      .then((sys) => {
        if (!cancelled) setSystems(sys);
        return compareDates(
          dates,
          selectedSystems.length ? selectedSystems : undefined,
          selectedParams.length ? selectedParams : undefined,
        );
      })
      .then((m) => {
        if (!cancelled) setMatrix(m);
      })
      .catch(() => {
        if (!cancelled) setError("Помилка мережі");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [dates, selectedSystems, selectedParams]);

  // Build rows
  const rows = useMemo(() => {
    const systemIds = selectedSystems.length
      ? systems.filter((s) => selectedSystems.includes(s.id) && s.implemented)
      : systems;
    const out: { systemId: string; systemName: string; key: string; label: string }[] = [];
    for (const s of systemIds) {
      const params = (s.parameters ?? []).filter(
        (p) => !selectedParams.length || selectedParams.includes(p.key),
      );
      for (const p of params) {
        out.push({ systemId: s.id, systemName: s.name, key: p.key, label: p.label });
      }
    }
    return out;
  }, [systems, selectedSystems, selectedParams]);

  // No dates
  if (dates.length === 0) {
    return (
      <div className="wb-block-compare-table">
        <p className="wb-text-muted">Невірний формат дат у посиланні.</p>
        <a className="wb-btn wb-btn-secondary" href={backUrl}>
          Співставити дати
        </a>
      </div>
    );
  }

  return (
    <div className="wb-block-compare-table">
      <h2>{title}</h2>
      <p className="wb-text-sm wb-text-muted" style={{ marginBottom: "var(--sp-4)" }}>
        Прокручуйте таблицю горизонтально, щоб бачити всі дати.
      </p>

      {loading && <p className="wb-text-sm wb-text-muted">Аналізуємо...</p>}
      {error && <p className="wb-text-sm" style={{ color: "var(--color-danger, #ef4444)" }}>{error}</p>}

      {!loading && !error && (
        <div style={{ overflowX: "auto" }}>
          <table className="wb-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ minWidth: 150 }}>Система / параметр</th>
                {dates.map((d) => (
                  <th key={d} style={{ minWidth: 120 }}>
                    {formatDate(d)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const showSystemHeader = idx === 0 || rows[idx - 1].systemId !== r.systemId;
                return (
                  <Fragment key={`${r.systemId}-${r.key}`}>
                    {showSystemHeader && (
                      <tr style={{ background: "var(--bg-2, #f8fafc)" }}>
                        <td
                          style={{ fontWeight: 600, fontStyle: "italic" }}
                          colSpan={dates.length + 1}
                        >
                          {r.systemName}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className="wb-text-sm">{r.label}</td>
                      {dates.map((d) => {
                        const value = matrix[d]?.[r.systemId]?.[r.key];
                        return (
                          <td key={d} className="wb-text-sm">
                            {value ?? "—"}
                          </td>
                        );
                      })}
                    </tr>
                  </Fragment>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={dates.length + 1} className="wb-text-sm wb-text-muted" style={{ textAlign: "center", padding: "var(--sp-4)" }}>
                    Немає даних для відображення
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


