/**
 * Page Builder — CompareTableBlock.
 *
 * Матриця співставлення: рядок — параметр, стовпець — дата. Рядок розкривається
 * в пояснення параметра (перший стовпець) і трактування значення кожної дати —
 * значення в чужих осередках не читається без тексту.
 *
 * @module packages/ui/src/blocks/CompareTableBlock
 */

import { Fragment, useState, useEffect, useMemo } from "react";
import { Icon } from "@wwwuabot/shared";
import { useExpansion } from "@wwwuabot/ui/hooks";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { formatDate } from "@wwwuabot/shared/utils/mydate-helpers";
import {
  compareDates,
  fetchSystems,
  type AnalysisSystem,
  type CompareDetails,
  type CompareMatrix,
} from "./mydate/api";

// ── Types ─────────────────────────────────────────────────────────

type SystemCard = AnalysisSystem;

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

  const { isExpanded, toggleExpanded } = useExpansion();

  const [systems, setSystems] = useState<SystemCard[]>([]);
  const [matrix, setMatrix] = useState<CompareMatrix>({});
  const [details, setDetails] = useState<CompareDetails>({});
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
      .then((result) => {
        if (cancelled) return;
        setMatrix(result.matrix);
        setDetails(result.details);
      })
      .catch((reason: unknown) => {
        // Повідомлення сервера каже людині, що саме не так («Немає дат»), і
        // втрачати його на користь спільного «Помилка мережі» — це дефект.
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "Помилка мережі");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
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
      {error && (
        <p className="wb-text-sm" style={{ color: "var(--color-danger, #ef4444)" }}>
          {error}
        </p>
      )}

      {!loading && !error && (
        <div className="wb-param-frame">
          <table className="wb-param-table wb-param-table--compare">
            <thead>
              <tr>
                <th scope="col">Параметр</th>
                {dates.map((d) => (
                  <th key={d} scope="col">
                    {formatDate(d)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const showSystemHeader = idx === 0 || rows[idx - 1].systemId !== r.systemId;
                const rowId = `${r.systemId}:${r.key}`;
                const open = isExpanded(rowId);
                // Пояснення параметра не залежить від дати, тож беремо перше,
                // яке прийшло: порожня комірка — це не «немає тексту в довіднику».
                const about = dates
                  .map((d) => details[d]?.[r.systemId]?.[r.key]?.about)
                  .find(Boolean);
                return (
                  <Fragment key={rowId}>
                    {showSystemHeader && (
                      <tr className="wb-param-group">
                        <td colSpan={dates.length + 1}>{r.systemName}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="wb-param-cell--toggle">
                        <button
                          type="button"
                          className={
                            open ? "wb-param-toggle wb-param-toggle--open" : "wb-param-toggle"
                          }
                          aria-expanded={open}
                          onClick={() => toggleExpanded(rowId)}
                        >
                          <span>{r.label}</span>
                          <span className="wb-param-toggle__caret">
                            <Icon name={open ? "chevron-up" : "chevron-down"} size={16} />
                          </span>
                        </button>
                      </td>
                      {dates.map((d) => (
                        <td key={d} className="wb-param-value">
                          {matrix[d]?.[r.systemId]?.[r.key] ?? "—"}
                        </td>
                      ))}
                    </tr>
                    {open && (
                      <tr className="wb-param-detail">
                        <td>
                          <span className="wb-param-detail__caption">Пояснення параметра</span>
                          {about ?? "—"}
                        </td>
                        {dates.map((d) => (
                          <td key={d}>
                            <span className="wb-param-detail__caption">Трактування</span>
                            {details[d]?.[r.systemId]?.[r.key]?.meaning ?? "—"}
                          </td>
                        ))}
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={dates.length + 1}
                    className="wb-text-sm wb-text-muted"
                    style={{ textAlign: "center", padding: "var(--sp-4)" }}
                  >
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
