import { MiddlewareFn } from "grammy";
import { recordUserEvent } from "@wwwuabot/shared/database/user-events";
import type { AppContext, Env } from "../../shared/types/env";
import { buildUserEvent } from "./builder";

/**
 * Пише подію в журнал — і **ніколи не валить оновлення**.
 *
 * Журнал — спостереження, а не частина відповіді: якщо D1 недоступна, людина
 * мусить усе одно отримати свій екран. Тому помилка тут лише лишає слід у
 * логах воркера.
 */
async function record(ctx: AppContext, env: Env, status: "ok" | "error"): Promise<void> {
  const event = buildUserEvent(ctx, status);
  if (!event) return;
  try {
    await recordUserEvent(env.DB, event);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        context: "user_event_write_failed",
        message: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

export const comprehensiveLogger: MiddlewareFn<AppContext> = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    await record(ctx, ctx.env, "error");
    throw error;
  }

  await record(ctx, ctx.env, "ok");
};
