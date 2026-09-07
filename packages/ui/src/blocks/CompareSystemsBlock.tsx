/**
 * Page Builder — CompareSystemsBlock.
 *
 * System/parameter selection for the comparison workflow.
 * Replaces the hardcoded CompareSystemsPage.
 *
 * Reads dates from URL params, fetches available systems,
 * lets user select systems + parameters, then navigates to results.
 *
 * @module packages/ui/src/blocks/CompareSystemsBlock
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

// ── API helpers ───────────────────────────────────────────────────

async function fetchSystems(): Promise<SystemCard[]> {
  const res = await fetch("/api/mydate/systems");
  const data = await res.json();
  return data?.ok ? data.systems : [];
}

// ── Main Block Component ──────────────────────────────────────────

export function CompareSystemsBlock({ block }: BlockComponentProps) {
  const {
    title = "Оберіть системи та параметри",
    resultUrl = "/mydate",
    paramKey = "dates",
    systemKey = "sys",
    parameterKey = "p",
  } = block.props as {
    title?: string;
    resultUrl?: string;
    paramKey?: string;
    systemKey?: string;
    parameterKey?: string;
  };

  // Read dates from URL
  const dates = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get(paramKey) ?? "";
    return raw.split(",").filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  }, [paramKey]);

  const [systems, setSystems] = useState<SystemCard[]>([]);
  const [selected, setSelected] = useState<Record<string, Record<string, boolean>>>({});

  // Fetch systems on mount
  useEffect(() => {
    fetchSystems().then((list) => {
      setSystems(list);
      const init: Record<string, Record<string, boolean>> = {};
      for (const s of list) {
        if (!s.implemented) continue;
        init[s.id] = {};
        for (const p of s.parameters ?? []) init[s.id][p.key] = true;
      }
      setSelected(init);
    });
  }, []);

  const isSystemSelected = useCallback(
    (id: string) => Object.values(selected[id] ?? {}).some(Boolean),
    [selected],
  );

  const toggleSystem = useCallback((id: string, value: boolean) => {
    setSelected((prev) => {
      const next = { ...prev, [id]: { ...(prev[id] ?? {}) } };
      const sys = systems.find((s) => s.id === id);
      for (const p of sys?.parameters ?? []) next[id][p.key] = value;
      return next;
    });
  }, [systems]);

  const toggleParam = useCallback((id: string, key: string, value: boolean) => {
    setSelected((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), [key]: value },
    }));
  }, []);

  const compare = useCallback(() => {
    if (dates.length === 0) return;
    const sys = systems
      .filter((s) => s.implemented && isSystemSelected(s.id))
      .map((s) => s.id);
    const prm = Array.from(
      new Set(
        systems.flatMap((s) =>
          (s.parameters ?? [])
            .filter((p) => selected[s.id]?.[p.key])
            .map((p) => p.key),
        ),
      ),
    );

    // Build result URL: /mydate/date1+date2+...?sys=...&p=...
    const datePath = dates.join("+");
    const qs = new URLSearchParams();
    if (sys.length) qs.set(systemKey, sys.join(","));
    if (prm.length) qs.set(parameterKey, prm.join(","));
    const qsStr = qs.toString();
    window.location.href = `${resultUrl}/${datePath}${qsStr ? `?${qsStr}` : ""}`;
  }, [dates, systems, selected, isSystemSelected, resultUrl, systemKey, parameterKey]);

  // No dates
  if (dates.length === 0) {
    return (
      <div className="wb-block-compare-systems">
        <p className="wb-text-muted">Не знайдено дат для аналізу.</p>
      </div>
    );
  }

  return (
    <div className="wb-block-compare-systems">
      <h2>{title}</h2>
      <p className="wb-text-sm wb-text-muted" style={{ marginBottom: "var(--sp-4)" }}>
        Дат для співставлення: {dates.length}
      </p>

      {/* System selection */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", marginBottom: "var(--sp-4)" }}>
        {systems.map((s) => (
          <div
            key={s.id}
            style={{
              padding: "var(--sp-4)",
              background: "var(--bg-1, #fff)",
              border: "1px solid var(--border-subtle, #e2e8f0)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={s.implemented && isSystemSelected(s.id)}
                disabled={!s.implemented}
                onChange={(e) => toggleSystem(s.id, e.target.checked)}
              />
              <strong>{s.name}</strong>
              {!s.implemented && <em className="wb-text-sm wb-text-muted"> (скоро)</em>}
            </label>

            {s.implemented && isSystemSelected(s.id) && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "var(--sp-3)",
                  marginTop: "var(--sp-3)",
                  paddingLeft: "var(--sp-6)",
                }}
              >
                {(s.parameters ?? []).map((p) => (
                  <label
                    key={p.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--sp-1)",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!selected[s.id]?.[p.key]}
                      onChange={(e) => toggleParam(s.id, p.key, e.target.checked)}
                    />
                    <span className="wb-text-sm">{p.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action button */}
      <button
        className="wb-btn wb-btn-primary"
        onClick={compare}
        disabled={!systems.some((s) => s.implemented && isSystemSelected(s.id))}
        style={{ width: "100%" }}
      >
        Співставити
      </button>
    </div>
  );
}
