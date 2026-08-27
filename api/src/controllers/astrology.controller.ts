import type { Env } from "../shared/types";
import { apiLog } from "../shared/logger";
import {
  SYSTEM_CALCULATORS,
  getSystemsRegistry,
  getAnalysis,
  saveAnalysis,
} from "../shared/mydate-helpers";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── GET /api/mydate/analysis/:date ──────────────────────────────────

export async function handleAnalysisRead(
  request: Request,
  env: Env,
  date: string,
): Promise<Response> {
  if (!DATE_RE.test(date)) {
    return json({ ok: false, error: "Invalid date format, expected YYYY-MM-DD" }, 400);
  }
  try {
    const systems = await getAnalysis(env.DB, env.CONTENT_KV, date);
    return json({ ok: true, date, systems });
  } catch (e: any) {
    apiLog.error("Analysis read error", e);
    return json({ ok: false, error: e?.message ?? "Unknown error" }, 500);
  }
}

// ── POST /api/mydate/analyze ────────────────────────────────────────

export async function handleAnalyze(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const body: any = await request.json();
    const date = body?.date;
    const systemId = body?.systemId;
    if (!date || !DATE_RE.test(date)) {
      return json({ ok: false, error: "Invalid or missing date" }, 400);
    }
    const calculator = SYSTEM_CALCULATORS[systemId];
    if (!calculator) {
      return json({ ok: false, error: `System "${systemId}" is not implemented yet` }, 400);
    }
    const result = calculator(date);
    const allSystems = await saveAnalysis(env.DB, env.CONTENT_KV, date, systemId, result);
    return json({ ok: true, date, systemId, result, systems: allSystems });
  } catch (e: any) {
    apiLog.error("Analyze error", e);
    return json({ ok: false, error: e?.message ?? "Unknown error" }, 500);
  }
}

// ── GET /api/mydate/systems ─────────────────────────────────────────

export async function handleSystems(env: Env): Promise<Response> {
  try {
    const systems = await getSystemsRegistry(env);
    return json({ ok: true, systems });
  } catch (e: any) {
    apiLog.error("KV systems error", e);
    return json({ ok: false, error: e?.message ?? "Unknown error" }, 500);
  }
}

// ── POST /api/mydate/compare ────────────────────────────────────────

export async function handleCompare(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    const body: any = await request.json();
    const dates: string[] = Array.isArray(body?.dates) ? body.dates : [];
    const systemIds: string[] | undefined =
      Array.isArray(body?.systemIds) && body.systemIds.length ? body.systemIds : undefined;
    const parameterKeys: string[] | undefined =
      Array.isArray(body?.parameterKeys) && body.parameterKeys.length
        ? body.parameterKeys
        : undefined;

    const validDates = dates.filter((d) => DATE_RE.test(d));
    if (validDates.length === 0) {
      return json({ ok: false, error: "No valid dates provided" }, 400);
    }
    if (validDates.length > 30) {
      return json({ ok: false, error: "Too many dates, max 30" }, 400);
    }

    const registry = await getSystemsRegistry(env);
    const targetSystems = systemIds
      ? registry.filter((s) => systemIds.includes(s.id) && s.implemented)
      : registry.filter((s) => s.implemented);

    const matrix: Record<string, any> = {};
    for (const date of validDates) {
      const analysis = await getAnalysis(env.DB, env.CONTENT_KV, date);
      const perSystem: Record<string, any> = {};
      for (const sys of targetSystems) {
        let result = analysis[sys.id];
        if (!result) {
          const calculator = SYSTEM_CALCULATORS[sys.id];
          if (!calculator) continue;
          result = calculator(date);
          await saveAnalysis(env.DB, env.CONTENT_KV, date, sys.id, result);
        }
        const selected = parameterKeys
          ? (result.parameters ?? []).filter((p: any) => parameterKeys.includes(p.key))
          : (result.parameters ?? []);
        perSystem[sys.id] = Object.fromEntries(selected.map((p: any) => [p.key, p.value]));
      }
      matrix[date] = perSystem;
    }

    return json({
      ok: true,
      dates: validDates,
      systems: targetSystems.map((s) => s.id),
      matrix,
    });
  } catch (e: any) {
    apiLog.error("Compare error", e);
    return json({ ok: false, error: e?.message ?? "Unknown error" }, 500);
  }
}
