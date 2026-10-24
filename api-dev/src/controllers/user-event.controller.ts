/**
 * `POST /api/user/event` — застосунок каже, що людина **зробила**: відкрила
 * сторінку чи вікно, натиснула, обрала, ввела. Ключ екрана — зі
 * `PLATFORM_SCREENS`, підпис — із `initData`, назва — те, що видно в шапці.
 *
 * @module api-dev/src/controllers/user-event.controller
 */

import { z } from "zod";
import { isPlatformGestureKind, isPlatformScreenKey } from "@wwwuabot/shared/events";
import type { Env } from "../shared/types";
import { apiLog } from "../shared/logger";
import { readBody } from "../shared/body";
import { tryResolveUserId } from "../shared/identity";
import {
  recordPlatformGesture,
  recordPlatformModal,
  recordPlatformView,
} from "../services/user-events.service";

const eventSchema = z.object({
  screen: z.string().min(1).max(40),
  /** Немає `kind` — це «відкрив сторінку»: стара форма лишається чинною. */
  kind: z.enum(["view", "modal", "click", "input"]).optional(),
  /** Людська назва: заголовок сторінки чи модалки (`null` — ще невідома). */
  title: z.string().trim().min(1).max(80).nullish(),
  /** Сторінка, на якій діялась дія: назва з шапки. */
  page: z.string().trim().min(1).max(80).optional(),
  /** Підпис контрола або те, що людина обрала чи ввела. */
  label: z.string().trim().min(1).max(200).optional(),
  /** Назва поля — лише для вибору й уведення: без неї значення не пояснює себе. */
  field: z.string().trim().min(1).max(160).optional(),
  /** Коли людина зробила дію (мс): дотик чекає поверхню, назва — дані. */
  at: z.number().int().positive().optional(),
});

/** Час дії від застосунку; далеке значення (чужий годинник) не береться. */
function actionTime(value: number | undefined): number | undefined {
  if (!value) return undefined;
  return Math.abs(Date.now() - value) <= 24 * 3600_000 ? value : undefined;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** `POST /api/user/event` — один рядок журналу: місце, модалка, дотик, вибір. */
export async function handleUserEvent(request: Request, env: Env): Promise<Response> {
  const parsed = await readBody(request, eventSchema);
  if (!parsed.ok) return parsed.response;
  const { screen, title, page, label, field } = parsed.body;
  const kind = parsed.body.kind ?? "view";
  const at = actionTime(parsed.body.at);

  if (!isPlatformScreenKey(screen)) return json({ error: "Невідомий екран" }, 400);
  if (kind === "modal" && !title) return json({ error: "Модалка без назви" }, 400);
  if ((kind === "click" || kind === "input") && (!label || !isPlatformGestureKind(kind))) {
    return json({ error: "Жест без назви" }, 400);
  }

  const userId = await tryResolveUserId(request, env);
  if (userId === null) return json({ error: "Unauthorized" }, 401);

  try {
    if (kind === "view") await recordPlatformView(env, userId, screen, title, at);
    else if (kind === "modal")
      await recordPlatformModal(
        env,
        userId,
        { screen, title: title as string, page: page ?? null },
        at,
      );
    else
      await recordPlatformGesture(
        env,
        userId,
        {
          kind,
          screen,
          label: label as string,
          field: field ?? null,
          page: page ?? null,
        },
        at,
      );
    return json({ ok: true });
  } catch (error) {
    // Журнал не мусить ламати екран: навігація вже сталася.
    apiLog.error("events: запис події застосунку", error);
    return json({ ok: false }, 200);
  }
}
