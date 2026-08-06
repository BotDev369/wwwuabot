import { MiddlewareFn } from "grammy";
import type { AppContext } from "../../../shared/types/env";
import { UserRepository } from "../../../modules/users/user.repository";
import { sendOrEditLiveMessage } from "../../../shared/utils/screen";
import { botRouter } from "../../router/bot-router";
import { log } from "../../../shared/utils/debug";
import { dispatchNotification } from "../../../modules/notifications/dispatcher";

export const postMiddleware: MiddlewareFn<AppContext> = async (ctx) => {
  log("POST", "─── update received ──────────────────────");

  // 1. Маршрутизація
  await botRouter(ctx);

  // 2. Рендеринг
  let liveSent = false;
  if (ctx.screen) {
    log("POST", "screen is set, rendering...");
    liveSent = await sendOrEditLiveMessage(ctx);
  } else {
    log("POST", "no screen set, skipping render");
  }

  // 3. Асинхронна відправка відкладених нотифікацій (ПЕРЕД збереженням в БД!)
  // Перевіряємо чи є notify_groups в поточному екрані
  if (ctx.screen?.notify_groups && ctx.screen?.notify_template) {
    log("POST:notify", "notifications configured for this screen");

    // Визначаємо дані для нотифікації
    const notificationData = ctx.pendingNotification?.data || {};

    log("POST:notify", "dispatching notification", {
      has_pending_data: !!ctx.pendingNotification,
      data_keys: Object.keys(notificationData)
    });

    try {
      await dispatchNotification(ctx, notificationData);
      log("POST:notify", "dispatch complete");
    } catch (err) {
      log("POST:notify", "fatal error in dispatcher", { error: String(err) });
    }
  }

  // 4. Збереження стану в БД (ТЕПЕР ТУТ — після нотифікацій, щоб зберегти user.topics)
  if (ctx.userDirty && ctx.user && ctx.from) {
    const updates: Record<string, any> = {};
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

  // 5. Видалення повідомлення юзера
  // ← ДОДАТИ ПЕРЕВІРКУ: якщо це було Rich Message, видалення вже зроблено в screen.ts
  if (ctx.message && ctx.message.text && ctx.chat && liveSent && !ctx.screen?.rich_message) {
    log("POST:delete", "deleting user message", { message_id: ctx.message.message_id });
    try {
      await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);
      log("POST:delete", "deleted");
    } catch (err) {
      log("POST:delete", "failed (no admin rights or already deleted)");
    }
  } else {
    log("POST:delete", "skip | no message to delete");
  }

  log("POST", "─── done ───────────────────────────────────");
};