import { z } from "zod";
import type { Env } from "../shared/types";
import { readBody } from "../shared/body";
import { apiLog } from "../shared/logger";
import {
  SYSTEM_CALCULATORS,
  getSystemsRegistry,
  getAnalysis,
  saveAnalysis,
} from "../shared/mydate-helpers";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Дати — рядки, бо `DATE_RE` перевіряє саме рядок: число `20240101` не пройшло
 * б ні формат, ні жодного розрахунку. Поля лишаються необов'язковими, щоб
 * причина відмови («Invalid or missing date», «Missing systemId») лишалася
 * такою самою для людини, а не перетворилася на безлике «Invalid body».
 */
const analyzeBody = z
  .object({ date: z.string().optional(), systemId: z.string().optional() })
  .passthrough();

/** Порівняння: усі три переліки — рядки, і порожні лишаються порожніми. */
const compareBody = z
  .object({
    dates: z.array(z.string()).optional(),
    systemIds: z.array(z.string()).optional(),
    parameterKeys: z.array(z.string()).optional(),
  })
  .passthrough();

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
  } catch (e: unknown) {
    apiLog.error("Analysis read error", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return json({ ok: false, error: msg }, 500);
  }
}

// ── POST /api/mydate/analyze ────────────────────────────────────────
export async function handleAnalyze(request: Request, env: Env): Promise<Response> {
  try {
    const parsed = await readBody(request, analyzeBody);
    if (!parsed.ok) return parsed.response;
    const { date, systemId } = parsed.body;

    if (!date || !DATE_RE.test(date)) {
      return json({ ok: false, error: "Invalid or missing date" }, 400);
    }
    if (!systemId) {
      return json({ ok: false, error: "Missing systemId" }, 400);
    }

    const calculator = SYSTEM_CALCULATORS[systemId];
    if (!calculator) {
      return json({ ok: false, error: `System "${systemId}" is not implemented yet` }, 400);
    }

    const result = calculator(date);
    const allSystems = await saveAnalysis(env.DB, env.CONTENT_KV, date, systemId, result);

    return json({ ok: true, date, systemId, result, systems: allSystems });
  } catch (e: unknown) {
    apiLog.error("Analyze error", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return json({ ok: false, error: msg }, 500);
  }
}

// ── GET /api/mydate/systems ─────────────────────────────────────────
export async function handleSystems(env: Env): Promise<Response> {
  try {
    const systems = await getSystemsRegistry(env);
    return json({ ok: true, systems });
  } catch (e: unknown) {
    apiLog.error("KV systems error", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return json({ ok: false, error: msg }, 500);
  }
}

// ── POST /api/mydate/compare ────────────────────────────────────────
export async function handleCompare(request: Request, env: Env): Promise<Response> {
  try {
    const parsed = await readBody(request, compareBody);
    if (!parsed.ok) return parsed.response;
    const dates = parsed.body.dates ?? [];
    const systemIds = parsed.body.systemIds?.length ? parsed.body.systemIds : undefined;
    const parameterKeys = parsed.body.parameterKeys?.length ? parsed.body.parameterKeys : undefined;

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

    const matrix: Record<string, Record<string, Record<string, unknown>>> = {};

    for (const date of validDates) {
      const analysis = await getAnalysis(env.DB, env.CONTENT_KV, date);
      const perSystem: Record<string, Record<string, unknown>> = {};

      for (const sys of targetSystems) {
        let result = analysis[sys.id];
        if (!result) {
          const calculator = SYSTEM_CALCULATORS[sys.id];
          if (!calculator) continue;
          result = calculator(date);
          await saveAnalysis(env.DB, env.CONTENT_KV, date, sys.id, result);
        }
        const params = Array.isArray(result?.parameters)
          ? (result.parameters as Array<{ key: string; value: unknown }>)
          : [];
        const selected = parameterKeys
          ? params.filter((p) => parameterKeys.includes(p.key))
          : params;
        perSystem[sys.id] = Object.fromEntries(selected.map((p) => [p.key, p.value]));
      }

      matrix[date] = perSystem;
    }

    return json({
      ok: true,
      dates: validDates,
      systems: targetSystems.map((s) => s.id),
      matrix,
    });
  } catch (e: unknown) {
    apiLog.error("Compare error", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return json({ ok: false, error: msg }, 500);
  }
}
