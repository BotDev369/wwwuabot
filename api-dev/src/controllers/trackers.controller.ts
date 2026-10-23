/**
 * Трекери: «Мої» (`GET/POST/PATCH/DELETE`), «Шаблони» й «Публічні» (читання й
 * копія через `POST { from }` та `{ sources }`), записи — `/entry`; власника
 * дає лише підписаний `initData`. Групи — `trackers-groups.controller.ts`.
 *
 * @module api-dev/src/controllers/trackers.controller
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { z } from "zod";
import {
  TRACKER_LIMITS,
  addTrackerDays,
  isValidTrackerDay,
  todayTrackerDay,
  parseTrackerSource,
  trackerValue,
  validateTrackerFields,
} from "@wwwuabot/shared/trackers";
import type { Env } from "../shared/types";
import { readBody } from "../shared/body";
import { resolveUserId } from "../shared/identity";
import { apiLog } from "../shared/logger";
import {
  addTrackerFrom,
  addTrackersFrom,
  listPublicTrackers,
  listTemplates,
} from "../services/trackers-library";
import {
  insertTrackerEntry,
  listEntries,
  readTrackerEntries,
  removeTrackerEntry,
} from "../services/trackers-entries";
import {
  archiveTracker,
  createTracker,
  listGroups,
  listTrackers,
  moveTracker,
  moveTrackerOrder,
  readTracker,
  setTrackerPublic,
} from "../services/trackers.service";

/** Вікно стрічки: чи записано сьогодні й останній вимір кожного трекера. */
const LIST_DAYS = 30;

/** Історія одного трекера: 400 днів — лінія за довге вікно й зсув за рік. */
const HISTORY_DAYS = 400;

/**
 * `POST` — три дії на одному шляху: копія одного джерела (`from`), копія
 * списку ( `sources` — «додати всю групу») і власна мірка (поля форми).
 * Групове додавання тут, а не окремою ручкою: це та сама копія, лише пачкою.
 */
const postBody = z
  .object({ from: z.unknown().optional(), sources: z.array(z.string()).optional() })
  .passthrough();
/**
 * `PATCH` міняє **одну** річ за раз: групу, місце серед сусідів або
 * публічність. Одне тіло на три дії — бо це той самий рядок, і друга ручка на
 * кожну ознаку розвела б правила володіння на три копії.
 */
const patchBody = z.object({
  id: z.number(),
  groupId: z.number().nullable().optional(),
  move: z.enum(["up", "down"]).optional(),
  isPublic: z.boolean().optional(),
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
      const parsed = await readBody(request, patchBody);
      if (!parsed.ok) return parsed.response;
      const { id, groupId, move, isPublic } = parsed.body;
      if (!Number.isInteger(id) || id <= 0)
        return json({ ok: false, error: "Invalid tracker" }, 400);

      // Порядок: перестановка міняє всіх сусідів, тож у відповідь іде свіжий
      // перелік рядків — як у груп, а не один пересунутий.
      if (move !== undefined) {
        const moved = await moveTrackerOrder(env, identity.userId, id, move === "up" ? -1 : 1);
        if (!moved) return json({ ok: false, error: "Not found" }, 404);
        return json({ ok: true, trackers: await listTrackers(env, identity.userId) });
      }

      if (isPublic !== undefined) {
        // Чужий трекер — та сама відмова, що й чужа група: код не підказує,
        // що номер існує в іншої людини.
        if (!(await setTrackerPublic(env, identity.userId, id, isPublic))) {
          return json({ ok: false, error: "Not found" }, 404);
        }
        return json({ ok: true, id, isPublic });
      }

      if (groupId === undefined) return json({ ok: false, error: "Missing change" }, 400);
      if (groupId !== null && (!Number.isInteger(groupId) || groupId <= 0)) {
        return json({ ok: false, error: "Invalid group" }, 400);
      }
      if (!(await moveTracker(env, identity.userId, id, groupId))) {
        return json({ ok: false, error: "Not found" }, 404);
      }
      return json({ ok: true, id, groupId });
    }

    if (request.method === "POST") {
      const parsed = await readBody(request, postBody);
      if (!parsed.ok) return parsed.response;

      // «Додати всю групу» — ті самі копії, але однією відповіддю: клієнт
      // не має складати дерево з половини доданих рядків.
      if (parsed.body.sources !== undefined) {
        const sources = parsed.body.sources.map(parseTrackerSource);
        if (sources.length === 0 || sources.some((source) => source === null)) {
          return json({ ok: false, error: "Unknown source" }, 400);
        }
        const valid = sources.filter((source) => source !== null);
        const trackers = await listTrackers(env, identity.userId);
        if (trackers.length + valid.length > TRACKER_LIMITS.trackers) {
          return json({ ok: false, error: "Забагато трекерів." }, 400);
        }
        const added = await addTrackersFrom(env, identity.userId, valid);
        if (!added) return json({ ok: false, error: "Not found" }, 404);
        return json({ ok: true, trackers: added });
      }

      // «Додати в мої» — копія шаблону або чужого публічного визначення.
      // `from` є — це додавання; немає — людина створює власну мірку.
      if (parsed.body.from !== undefined) {
        const source = parseTrackerSource(parsed.body.from);
        if (!source) return json({ ok: false, error: "Unknown source" }, 400);
        const trackers = await listTrackers(env, identity.userId);
        if (trackers.length >= TRACKER_LIMITS.trackers) {
          return json({ ok: false, error: "Забагато трекерів." }, 400);
        }
        const tracker = await addTrackerFrom(env, identity.userId, source);
        // Неіснуючий або закритий — одна відповідь: номер не підказує, що
        // в когось такий трекер є.
        if (!tracker) return json({ ok: false, error: "Not found" }, 404);
        return json({ ok: true, tracker });
      }

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

/**
 * «Шаблони» — каталог як дані: читання нічого не пише й нічого не сіє.
 * Додавання йде через `POST /api/user/trackers { from: "catalog:<key>" }`, бо
 * копія — це рядок «Моїх», а не другий спосіб жити каталогу.
 */
export async function handleTrackerTemplates(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;
  try {
    return json({ ok: true, templates: await listTemplates(env, identity.userId) });
  } catch (error: unknown) {
    apiLog.error("Tracker templates error", error);
    return json({ ok: false, error: "Не вдалося завантажити шаблони" }, 500);
  }
}

/**
 * «Публічні» — лише визначення людей, які їх відкрили. Вимірів тут немає й
 * бути не може: публікується форма мірки, а не історія (`docs/TRACKERS.md`).
 */
export async function handleTrackerPublic(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;
  try {
    return json({ ok: true, trackers: await listPublicTrackers(env, identity.userId) });
  } catch (error: unknown) {
    apiLog.error("Tracker public error", error);
    return json({ ok: false, error: "Не вдалося завантажити публічні" }, 500);
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
