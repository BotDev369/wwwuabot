/**
 * Трекери: `GET` стрічки, `POST` власного трекера, `DELETE`/`PATCH` — прибрати
 * чи пересунути в іншу групу; групи — окрема ручка `/api/user/trackers/group`,
 * записи — `/api/user/trackers/entry` (день і момент ставить сервер), власника
 * дає лише підписаний `initData`.
 *
 * @module api-dev/src/controllers/trackers.controller
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { z } from "zod";
import {
  TRACKER_GROUP_LIMITS,
  TRACKER_LIMITS,
  addTrackerDays,
  isValidTrackerDay,
  todayTrackerDay,
  trackerValue,
  validateTrackerFields,
  validateTrackerGroupFields,
} from "@wwwuabot/shared/trackers";
import type { Env } from "../shared/types";
import { readBody } from "../shared/body";
import { resolveUserId } from "../shared/identity";
import { apiLog } from "../shared/logger";
import {
  archiveTracker,
  createGroup,
  createTracker,
  deleteGroup,
  insertTrackerEntry,
  listEntries,
  listGroups,
  listTrackers,
  moveGroup,
  moveTracker,
  readTracker,
  readTrackerEntries,
  removeTrackerEntry,
  updateGroup,
} from "../services/trackers.service";

/** Вікно стрічки: чи записано сьогодні й останній вимір кожного трекера. */
const LIST_DAYS = 30;

/** Історія одного трекера: 400 днів — лінія за довге вікно й зсув за рік. */
const HISTORY_DAYS = 400;

const anyObject = z.object({}).passthrough();
const moveBody = z.object({
  id: z.number(),
  groupId: z.number().nullable(),
});
const groupBody = z.object({
  id: z.number().optional(),
  title: z.string().optional(),
  parentId: z.number().nullable().optional(),
  move: z.enum(["up", "down"]).optional(),
});
const entryBody = z.object({
  trackerId: z.number(),
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
  if (!["GET", "POST", "PATCH", "DELETE"].includes(request.method)) {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    await ensureTables(env.DB, ["trackers", "tracker_entries", "tracker_groups"]);
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
        // Групи їдуть із карткою: вибір групи живе на ній, а не на стрічці.
        const groups = await listGroups(env, identity.userId);
        return json({ ok: true, tracker, groups, entries, endDay });
      }

      const trackers = await listTrackers(env, identity.userId);
      const groups = await listGroups(env, identity.userId);
      const entries = await listEntries(
        env,
        identity.userId,
        addTrackerDays(endDay, -(LIST_DAYS - 1)),
      );
      return json({ ok: true, trackers, groups, entries, endDay });
    }

    if (request.method === "PATCH") {
      const parsed = await readBody(request, moveBody);
      if (!parsed.ok) return parsed.response;
      const { id, groupId } = parsed.body;
      if (!Number.isInteger(id) || id <= 0)
        return json({ ok: false, error: "Invalid tracker" }, 400);
      if (groupId !== null && (!Number.isInteger(groupId) || groupId <= 0)) {
        return json({ ok: false, error: "Invalid group" }, 400);
      }
      // Чужа група — та сама відмова, що й чужий трекер: код не підказує,
      // що номер існує в іншої людини.
      if (!(await moveTracker(env, identity.userId, id, groupId))) {
        return json({ ok: false, error: "Not found" }, 404);
      }
      return json({ ok: true, id, groupId });
    }

    if (request.method === "POST") {
      const parsed = await readBody(request, anyObject);
      if (!parsed.ok) return parsed.response;
      const validated = validateTrackerFields(parsed.body);
      if (!validated.ok) return json({ ok: false, error: validated.message }, 400);
      const rawGroup: unknown = parsed.body.groupId ?? null;
      const groupId: number | null | undefined =
        rawGroup === null
          ? null
          : Number.isInteger(rawGroup) && Number(rawGroup) > 0
            ? Number(rawGroup)
            : undefined;
      if (groupId === undefined) return json({ ok: false, error: "Invalid group" }, 400);

      const trackers = await listTrackers(env, identity.userId);
      if (trackers.length >= TRACKER_LIMITS.trackers) {
        return json({ ok: false, error: "Забагато трекерів." }, 400);
      }
      const tracker = await createTracker(env, identity.userId, validated.value, groupId);
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
    const { trackerId, note = "" } = parsed.body;
    if (!Number.isInteger(trackerId) || trackerId <= 0) {
      return json({ ok: false, error: "Invalid tracker" }, 400);
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

    const entry = await insertTrackerEntry(env, identity.userId, trackerId, value, note.trim());
    if (!entry) return json({ ok: false, error: "Not found" }, 404);
    return json({ ok: true, entry });
  } catch (error: unknown) {
    apiLog.error("Tracker entry error", error);
    return json({ ok: false, error: "Не вдалося зберегти запис" }, 500);
  }
}

/**
 * Групи трекерів: `POST` — нова, `PATCH` — перейменувати, рухнути вгору/вниз
 * (`move`) чи перемістити в іншу групу, `DELETE` — прибрати (трекери й
 * підгрупи піднімаються на місце батька).
 * Типова тематика каталогу (її `key`) не видаляється — ключ це контракт
 * сіву, а видалення зламало б прив'язку нових мірок.
 */
export async function handleTrackerGroups(request: Request, env: Env): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;
  if (!["POST", "PATCH", "DELETE"].includes(request.method)) {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    await ensureTables(env.DB, ["tracker_groups"]);

    if (request.method === "DELETE") {
      const id = positiveId(new URL(request.url).searchParams.get("id"));
      if (id === null) return json({ ok: false, error: "Missing id" }, 400);
      const removed = await deleteGroup(env, identity.userId, id);
      if (removed === "builtin") {
        return json({ ok: false, error: "Типову тематику не можна прибрати." }, 400);
      }
      if (removed !== "ok") return json({ ok: false, error: "Not found" }, 404);
      return json({ ok: true, id });
    }

    const parsed = await readBody(request, groupBody);
    if (!parsed.ok) return parsed.response;

    if (request.method === "POST") {
      const validated = validateTrackerGroupFields(parsed.body);
      if (!validated.ok) return json({ ok: false, error: validated.message }, 400);
      const groups = await listGroups(env, identity.userId);
      if (groups.length >= TRACKER_GROUP_LIMITS.groups) {
        return json({ ok: false, error: "Забагато груп." }, 400);
      }
      // Батько — лише цієї людини: чужий номер не підказує, що він існує.
      if (
        validated.value.parentId !== null &&
        !groups.some((g) => g.id === validated.value.parentId)
      ) {
        return json({ ok: false, error: "Not found" }, 404);
      }
      const group = await createGroup(env, identity.userId, validated.value);
      if (!group) return json({ ok: false, error: "Не вдалося створити" }, 500);
      return json({ ok: true, group });
    }

    const id = positiveId(parsed.body.id === undefined ? null : String(parsed.body.id));
    if (id === null) return json({ ok: false, error: "Missing id" }, 400);

    // Рух вгору/вниз — окрема гілка PATCH: перестановка міняє порядок усіх
    // сусідів, тож у відповідь іде свіжий перелік груп, а не один рядок.
    if (parsed.body.move !== undefined) {
      const moved = await moveGroup(env, identity.userId, id, parsed.body.move === "up" ? -1 : 1);
      if (!moved.ok) return json({ ok: false, error: "Not found" }, 404);
      return json({ ok: true, groups: await listGroups(env, identity.userId) });
    }

    const fields: { title?: string; parentId?: number | null } = {};
    if (parsed.body.title !== undefined) {
      const validated = validateTrackerGroupFields({
        title: parsed.body.title,
        parentId: parsed.body.parentId ?? null,
      });
      if (!validated.ok) return json({ ok: false, error: validated.message }, 400);
      fields.title = validated.value.title;
    }
    if (parsed.body.parentId !== undefined) {
      fields.parentId = parsed.body.parentId;
      if (
        parsed.body.parentId !== null &&
        !(await listGroups(env, identity.userId)).some((g) => g.id === parsed.body.parentId)
      ) {
        return json({ ok: false, error: "Not found" }, 404);
      }
    }
    const result = await updateGroup(env, identity.userId, id, fields);
    // Цикл — це відмова валідації (400), а не «немає рядка»: номер є, але
    // під ним група не може стояти під власним нащадком.
    if (!result.ok) {
      return result.reason === "cycle"
        ? json({ ok: false, error: "Група не може бути під власною підгрупою." }, 400)
        : json({ ok: false, error: "Not found" }, 404);
    }
    return json({ ok: true, group: result.group });
  } catch (error: unknown) {
    apiLog.error("Tracker groups error", error);
    return json({ ok: false, error: "Не вдалося виконати дію" }, 500);
  }
}
