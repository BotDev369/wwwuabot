/**
 * `POST /api/user/event` — застосунок каже, що людина **зробила**: відкрила
 * екран, натиснула кнопку, обрала значення. Сервер цього не виведе з HTTP: запити
 * даних робить код. Ключ екрана — зі `PLATFORM_SCREENS`, підпис — із `initData`,
 * а жест мусить назвати те, що натиснули.
 *
 * @module api-dev/src/controllers/user-event.controller
 */

import { z } from "zod";
import { isPlatformGestureKind, isPlatformScreenKey } from "@wwwuabot/shared/events";
import type { Env } from "../shared/types";
import { apiLog } from "../shared/logger";
import { readBody } from "../shared/body";
import { tryResolveUserId } from "../shared/identity";
import { recordPlatformGesture, recordPlatformView } from "../services/user-events.service";

const eventSchema = z.object({
  screen: z.string().min(1).max(40),
  /** Немає `kind` — це «відкрив екран»: стара форма лишається чинною. */
  kind: z.enum(["view", "click", "input"]).optional(),
  label: z.string().trim().min(1).max(120).optional(),
  target: z.string().trim().min(1).max(60).optional(),
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** `POST /api/user/event` — один рядок журналу: екран або жест у ньому. */
export async function handleUserEvent(request: Request, env: Env): Promise<Response> {
  const parsed = await readBody(request, eventSchema);
  if (!parsed.ok) return parsed.response;
  const { screen, label, target } = parsed.body;
  const kind = parsed.body.kind ?? "view";

  if (!isPlatformScreenKey(screen)) return json({ error: "Невідомий екран" }, 400);
  if (kind !== "view" && (!label || !isPlatformGestureKind(kind))) {
    return json({ error: "Жест без назви" }, 400);
  }

  const userId = await tryResolveUserId(request, env);
  if (userId === null) return json({ error: "Unauthorized" }, 401);

  try {
    if (kind === "view") await recordPlatformView(env, userId, screen);
    else
      await recordPlatformGesture(env, userId, {
        kind,
        screen,
        label: label as string,
        target: target ?? null,
      });
    return json({ ok: true });
  } catch (error) {
    // Журнал не мусить ламати екран: навігація вже сталася.
    apiLog.error("events: запис події застосунку", error);
    return json({ ok: false }, 200);
  }
}
