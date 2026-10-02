import { MiddlewareFn } from "grammy";
import type { AppContext } from "../../../shared/types/env";
import { UserRepository } from "../../../modules/users/user.repository";
import { sendOrEditLiveMessage } from "../../../shared/utils/screen";
import { deleteIncomingMessage } from "../../../shared/utils/message";
import { botRouter } from "../../router/bot-router";
import { log } from "../../../shared/utils/debug";
import { dispatchNotification } from "../../../modules/notifications/dispatcher";

export const postMiddleware: MiddlewareFn<AppContext> = async (ctx) => {
  log("POST", "─── update received ──────────────────────");

  // 1. Маршрутизація
  await botRouter(ctx);

  // 2. Рендеринг (відправка нового + видалення старих повідомлень)
  if (ctx.screen) {
    log("POST", "screen is set, rendering...");
    const shown = await sendOrEditLiveMessage(ctx);

    // `/start` і діплінки зникають **лише після** того, як екран показано:
    // видалити раніше — значить знести повідомлення людини, не показавши їй
    // нічого (просто зникнути в Telegram). Прапорок ставить роутер, бо саме він
    // знає, що повідомлення не було показане окремо (екран запрошення, наприклад).
    if (shown && ctx.dropIncomingAfterRender) await deleteIncomingMessage(ctx);
  } else {
    log("POST", "no screen set, skipping render");
  }

  // 3. Нотифікації (якщо налаштовані)
  if (ctx.screen?.notify_groups && ctx.screen?.notify_template) {
    log("POST:notify", "notifications configured for this screen");
    const notificationData = ctx.pendingNotification?.data || {};

    try {
      await dispatchNotification(ctx, notificationData);
      log("POST:notify", "dispatch complete");
    } catch (err) {
      log("POST:notify", "error in dispatcher", { error: String(err) });
    }
  }

  // 4. Збереження стану в БД
  if (ctx.userDirty && ctx.user && ctx.from) {
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(ctx.user)) {
      if (key !== "user_id") {
        updates[key] = typeof value === "object" && value !== null ? JSON.stringify(value) : value;
      }
    }
    log("POST:db", "saving user", { fields: Object.keys(updates) });
    const repo = new UserRepository(ctx.env);
    await repo.updateUser(ctx.from.id, updates);
    log("POST:db", "saved");
  } else {
    log("POST:db", "skip | user not dirty");
  }

  log("POST", "─── done ───────────────────────────────────");
};
