/**
 * Групи трекерів — дерево власника: `POST` нова, `PATCH` перейменування, рух і
 * новий батько, `DELETE` прибирання; окремо `DELETE .../trackers` — спорожнити
 * групу, лишивши її саму. Типова тематика каталогу (`key !== null`) не
 * видаляється: її рядок сіється знову, тож у неї прибирають уміст.
 *
 * @module api-dev/src/controllers/trackers-groups.controller
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { z } from "zod";
import { TRACKER_GROUP_LIMITS, validateTrackerGroupFields } from "@wwwuabot/shared/trackers";
import type { Env } from "../shared/types";
import { readBody } from "../shared/body";
import { resolveUserId } from "../shared/identity";
import { apiLog } from "../shared/logger";
import {
  clearGroupTrackers,
  createGroup,
  deleteGroup,
  listGroups,
  moveGroup,
  updateGroup,
} from "../services/trackers.service";

const groupBody = z.object({
  id: z.number().optional(),
  title: z.string().optional(),
  parentId: z.number().nullable().optional(),
  move: z.enum(["up", "down"]).optional(),
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

/** Спорожнити групу: мірки піддерева зникають, рядок групи лишається. */
export async function handleTrackerGroupClear(request: Request, env: Env): Promise<Response> {
  if (request.method !== "DELETE") return json({ ok: false, error: "Method not allowed" }, 405);
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;
  try {
    await ensureTables(env.DB, ["tracker_groups", "trackers"]);
    const id = positiveId(new URL(request.url).searchParams.get("id"));
    if (id === null) return json({ ok: false, error: "Missing id" }, 400);
    const removed = await clearGroupTrackers(env, identity.userId, id);
    if (removed === null) return json({ ok: false, error: "Not found" }, 404);
    return json({ ok: true, removed });
  } catch (error: unknown) {
    apiLog.error("Tracker group clear error", error);
    return json({ ok: false, error: "Не вдалося виконати дію" }, 500);
  }
}

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
