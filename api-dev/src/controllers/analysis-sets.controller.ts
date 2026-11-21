/**
 * Набори для співставлення: список, запис, видалення. Склад — не значення:
 * сервер зберігає дати й підписи, а рівні рахує екран заново.
 *
 * @module api-dev/src/controllers/analysis-sets.controller
 */

import { z } from "zod";
import type { Env } from "../shared/types";
import { readBody } from "../shared/body";
import { resolveUserId } from "../shared/identity";
import {
  deleteAnalysisSet,
  listAnalysisSets,
  saveAnalysisSet,
} from "../services/analysis-sets.service";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const itemBody = z.object({
  date: z.string(),
  name: z.string().optional(),
});

const setBody = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  items: z.array(itemBody).optional(),
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleAnalysisSets(request: Request, env: Env): Promise<Response> {
  try {
    const identity = await resolveUserId(request, env);
    if (!identity.ok) return identity.response;
    const { userId } = identity;

    if (request.method === "GET") {
      return json({ ok: true, sets: await listAnalysisSets(env.DB, userId) });
    }

    if (request.method === "POST" || request.method === "PUT") {
      const parsed = await readBody(request, setBody);
      if (!parsed.ok) return parsed.response;

      const { id, name, items } = parsed.body;
      if (!id) return json({ ok: false, error: "id is required" }, 400);

      // Дата без виду `рррр-мм-дд` не стає датою: інакше набір показує склад,
      // з яким співставлення не рахується.
      const clean = (items ?? [])
        .filter((one) => DATE_RE.test(one.date))
        .map((one) => ({ date: one.date, name: one.name ?? "" }));

      const saved = await saveAnalysisSet(env.DB, userId, {
        id,
        name: name ?? "",
        items: clean,
      });
      return json({ ok: true, set: saved });
    }

    if (request.method === "DELETE") {
      const url = new URL(request.url);
      const id = url.searchParams.get("id");
      if (!id) return json({ ok: false, error: "id is required" }, 400);

      const deleted = await deleteAnalysisSet(env.DB, userId, id);
      if (deleted === 0) return json({ ok: false, error: "Not found" }, 404);
      return json({ ok: true });
    }

    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (error) {
    return json({ ok: false, error: (error as Error).message }, 500);
  }
}
