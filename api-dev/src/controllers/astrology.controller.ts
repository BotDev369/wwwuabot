import { z } from "zod";
import type { Env } from "../shared/types";
import { readBody } from "../shared/body";
import { apiLog } from "../shared/logger";
import { SYSTEM_CALCULATORS, getAnalysis, saveAnalysis } from "../shared/mydate-helpers";
import { withMeanings, withParameterAbout } from "../shared/mydate-interpretations";
import { listAnalysisSystems, listImplementedSystems } from "../services/analysis-systems.service";
import { dateNamesFor } from "../services/my-dates.service";
import { tryResolveUserId } from "../shared/identity";

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
    const stored = await getAnalysis(env.DB, env.CONTENT_KV, date);
    // Знімок у D1 — без пояснень і трактувань, тож дописуємо їх тут: інакше
    // дата, порахована до появи довідника, лишилась би без текстів назавжди.
    const systems = Object.fromEntries(
      Object.entries(stored).map(([systemId, result]) => [
        systemId,
        withMeanings(systemId, result),
      ]),
    );
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

    return json({
      ok: true,
      date,
      systemId,
      result: withMeanings(systemId, result),
      systems: allSystems,
    });
  } catch (e: unknown) {
    apiLog.error("Analyze error", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return json({ ok: false, error: msg }, 500);
  }
}

// ── GET /api/mydate/systems ─────────────────────────────────────────
// Із поясненнями параметрів: вітрина систем показує, **що визначає** параметр,
// ще до того, як людина ввела бодай одну дату.
export async function handleSystems(env: Env): Promise<Response> {
  try {
    const registry = await listAnalysisSystems(env.DB);
    const systems = registry.map((system) => ({
      ...system,
      parameters: withParameterAbout(system.id, system.parameters),
    }));
    return json({ ok: true, systems });
  } catch (e: unknown) {
    apiLog.error("Systems registry error", e);
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

    // Назви дат — для шапки таблиці: без ідентичності вони просто не приїжджають,
    // а порівняння лишається робочим (дата — те, що показано в рядку шапки).
    const userId = await tryResolveUserId(request, env);
    const names = userId === null ? {} : await dateNamesFor(env.DB, userId, validDates);

    const registry = await listImplementedSystems(env.DB);
    const targetSystems = systemIds ? registry.filter((s) => systemIds.includes(s.id)) : registry;

    const matrix: Record<string, Record<string, Record<string, unknown>>> = {};
    // Пояснення й трактування їдуть поруч із значеннями під тим самим ключем:
    // інакше таблиця аналізу малювала б самі значення, а тексти до них
    // довелося б тягнути окремим запитом на кожну дату.
    const details: Record<
      string,
      Record<string, Record<string, { about?: string; meaning?: string }>>
    > = {};

    for (const date of validDates) {
      const analysis = await getAnalysis(env.DB, env.CONTENT_KV, date);
      const perSystem: Record<string, Record<string, unknown>> = {};
      const perDetails: Record<string, Record<string, { about?: string; meaning?: string }>> = {};

      for (const sys of targetSystems) {
        let result = analysis[sys.id];
        if (!result) {
          const calculator = SYSTEM_CALCULATORS[sys.id];
          if (!calculator) continue;
          result = calculator(date);
          await saveAnalysis(env.DB, env.CONTENT_KV, date, sys.id, result);
        }
        const params = withMeanings(sys.id, result).parameters ?? [];
        const selected = parameterKeys
          ? params.filter((p) => parameterKeys.includes(p.key))
          : params;
        perSystem[sys.id] = Object.fromEntries(selected.map((p) => [p.key, p.value]));
        perDetails[sys.id] = Object.fromEntries(
          selected.map((p) => [p.key, { about: p.about, meaning: p.meaning }]),
        );
      }

      matrix[date] = perSystem;
      details[date] = perDetails;
    }

    return json({
      ok: true,
      dates: validDates,
      systems: targetSystems.map((s) => s.id),
      matrix,
      details,
      names,
    });
  } catch (e: unknown) {
    apiLog.error("Compare error", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return json({ ok: false, error: msg }, 500);
  }
}
