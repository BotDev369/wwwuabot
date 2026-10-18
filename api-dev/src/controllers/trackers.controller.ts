/**
 * Трекери: `GET` стрічки, `POST` власного трекера, `DELETE` — прибрати.
 * Друга ручка — дотики днів (`/api/user/trackers/entry`): збереження додає
 * новий рядок (день можна записувати багато разів), прибирання — за номером
 * запису. Власника дає лише підписаний `initData`.
 *
 * @module api-dev/src/controllers/trackers.controller
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { z } from "zod";
import {
  TRACKER_LIMITS,
  addTrackerDays,
  isValidTrackerDay,
  isWritableTrackerDay,
  todayTrackerDay,
  trackerValue,
  validateTrackerFields,
} from "@wwwuabot/shared/trackers";
import type { Env } from "../shared/types";
import { readBody } from "../shared/body";
import { resolveUserId } from "../shared/identity";
import { apiLog } from "../shared/logger";
import {
  archiveTracker,
  createTracker,
  insertTrackerEntry,
  listEntries,
  listTrackers,
  readTracker,
  readTrackerEntries,
  removeTrackerEntry,
} from "../services/trackers.service";

/** Вікно стрічки: серія, серія днів і «чи записано сьогодні». */
const LIST_DAYS = 30;

/** Історія одного трекера: 400 днів — серія й порівняння з минулим вікном. */
const HISTORY_DAYS = 400;

const anyObject = z.object({}).passthrough();
const entryBody = z.object({
  trackerId: z.number(),
  day: z.string(),
  value: z.number(),
  note: z.string().optional(),
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function positiveId(value: string | null): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function handleTrackers(request: Request, env: Env): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;
  if (!["GET", "POST", "DELETE"].includes(request.method)) {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    await ensureTables(env.DB, ["trackers", "tracker_entries"]);
    // «Сьогодні» — день людини, а не воркера: у Києві він настає раніше за UTC.
    const query = new URL(request.url).searchParams;
    const requested = query.get("day");
    const endDay = requested && isValidTrackerDay(requested) ? requested : todayTrackerDay();

    if (request.method === "GET") {
      const id = positiveId(query.get("id"));
      if (id !== null) {
        const tracker = await readTracker(env, identity.userId, id);
        // Чужий і неіснуючий — одна відповідь: код теж сказав би, що рядок є.
        if (!tracker) return json({ ok: false, error: "Not found" }, 404);
        const entries = await readTrackerEntries(
          env,
          identity.userId,
          id,
          addTrackerDays(endDay, -(HISTORY_DAYS - 1)),
        );
        return json({ ok: true, tracker, entries, endDay });
      }

      const trackers = await listTrackers(env, identity.userId);
      const entries = await listEntries(
        env,
        identity.userId,
        addTrackerDays(endDay, -(LIST_DAYS - 1)),
      );
      return json({ ok: true, trackers, entries, endDay });
    }

    if (request.method === "POST") {
      const parsed = await readBody(request, anyObject);
      if (!parsed.ok) return parsed.response;
      const validated = validateTrackerFields(parsed.body);
      if (!validated.ok) return json({ ok: false, error: validated.message }, 400);

      const trackers = await listTrackers(env, identity.userId);
      if (trackers.length >= TRACKER_LIMITS.trackers) {
        return json({ ok: false, error: "Забагато трекерів." }, 400);
      }
      const tracker = await createTracker(env, identity.userId, validated.value);
      if (!tracker) return json({ ok: false, error: "Не вдалося створити" }, 500);
      return json({ ok: true, tracker });
    }

    const id = positiveId(new URL(request.url).searchParams.get("id"));
    if (id === null) return json({ ok: false, error: "Missing id" }, 400);
    if (!(await archiveTracker(env, identity.userId, id))) {
      return json({ ok: false, error: "Not found" }, 404);
    }
    return json({ ok: true, id });
  } catch (error: unknown) {
    apiLog.error("Trackers error", error);
    return json({ ok: false, error: "Не вдалося виконати дію" }, 500);
  }
}

/** Дотики днів: збереження додає рядок, прибирання — за номером запису. */
export async function handleTrackerEntry(request: Request, env: Env): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;
  if (!["POST", "DELETE"].includes(request.method)) {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    await ensureTables(env.DB, ["trackers", "tracker_entries"]);

    if (request.method === "DELETE") {
      const entryId = positiveId(new URL(request.url).searchParams.get("id"));
      if (entryId === null) return json({ ok: false, error: "Missing entry" }, 400);
      if (!(await removeTrackerEntry(env, identity.userId, entryId))) {
        return json({ ok: false, error: "Not found" }, 404);
      }
      return json({ ok: true });
    }

    const parsed = await readBody(request, entryBody);
    if (!parsed.ok) return parsed.response;
    const { trackerId, day, note = "" } = parsed.body;
    if (!Number.isInteger(trackerId) || trackerId <= 0) {
      return json({ ok: false, error: "Invalid tracker" }, 400);
    }
    if (!isWritableTrackerDay(day)) {
      return json({ ok: false, error: "День записати не можна." }, 400);
    }
    if (note.length > TRACKER_LIMITS.note) {
      return json({ ok: false, error: "Нотатка задовга." }, 400);
    }

    const tracker = await readTracker(env, identity.userId, trackerId);
    if (!tracker) return json({ ok: false, error: "Not found" }, 404);

    const value = trackerValue(parsed.body.value, tracker);
    if (value === null) {
      return json({ ok: false, error: "Значення поза межами трекера." }, 400);
    }

    const entry = await insertTrackerEntry(
      env,
      identity.userId,
      trackerId,
      day,
      value,
      note.trim(),
    );
    if (!entry) return json({ ok: false, error: "Not found" }, 404);
    return json({ ok: true, entry });
  } catch (error: unknown) {
    apiLog.error("Tracker entry error", error);
    return json({ ok: false, error: "Не вдалося зберегти запис" }, 500);
  }
}
