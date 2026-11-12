import { MiddlewareFn } from "grammy";
import type { AppContext } from "../../../shared/types/env";
import { UserRepository } from "../../../modules/users/user.repository";
import { renderScenario } from "../../../shared/utils/scenario-screen";
import { deleteIncomingMessage } from "../../../shared/utils/message";
import { botRouter } from "../../router/bot-router";
import { log } from "../../../shared/utils/debug";
import { dispatchNotification } from "../../../modules/notifications/dispatcher";

export const postMiddleware: MiddlewareFn<AppContext> = async (ctx) => {
  log("POST", "─── update received ──────────────────────");

  await botRouter(ctx);

  if (ctx.scenario) {
    const shown = await renderScenario(ctx, ctx.scenario);
    if (shown) await deleteIncomingMessage(ctx);
  } else {
    log("POST", "no scenario set, skipping render");
  }

  if (ctx.scenario?.notify_groups && ctx.scenario?.notify_template) {
    try {
      await dispatchNotification(ctx, ctx.pendingNotification?.data || {});
    } catch (err) {
      log("POST:notify", "error in dispatcher", { error: String(err) });
    }
  }

  if (ctx.userDirty && ctx.user && ctx.from) {
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(ctx.user)) {
      if (key !== "user_id") {
        updates[key] = typeof value === "object" && value !== null ? JSON.stringify(value) : value;
      }
    }
    const repo = new UserRepository(ctx.env);
    await repo.updateUser(ctx.from.id, updates);
  }
};
