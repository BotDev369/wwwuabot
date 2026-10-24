/**
 * `POST /api/user/event` — застосунок каже, що людина **відкрила екран**: цього
 * сервер не виведе з HTTP, бо запити даних робить код, а не людина. Ключ
 * мусить бути зі `PLATFORM_SCREENS`, ідентичність — із підпису `initData`.
 *
 * @module api-dev/src/controllers/user-event.controller
 */

import { z } from "zod";
import { isPlatformScreenKey } from "@wwwuabot/shared/events";
import type { Env } from "../shared/types";
import { apiLog } from "../shared/logger";
import { readBody } from "../shared/body";
import { tryResolveUserId } from "../shared/identity";
import { recordPlatformView } from "../services/user-events.service";

const viewSchema = z.object({ screen: z.string().min(1).max(40) });

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** `POST /api/user/event` — один рядок «відкрив екран». */
export async function handleUserEvent(request: Request, env: Env): Promise<Response> {
  const parsed = await readBody(request, viewSchema);
  if (!parsed.ok) return parsed.response;
  if (!isPlatformScreenKey(parsed.body.screen)) return json({ error: "Невідомий екран" }, 400);

  const userId = await tryResolveUserId(request, env);
  if (userId === null) return json({ error: "Unauthorized" }, 401);

  try {
    await recordPlatformView(env, userId, parsed.body.screen);
    return json({ ok: true });
  } catch (error) {
    // Журнал не мусить ламати екран: навігація вже сталася.
    apiLog.error("events: запис відкритого екрана", error);
    return json({ ok: false }, 200);
  }
}
