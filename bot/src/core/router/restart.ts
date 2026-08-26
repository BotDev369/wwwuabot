import type { AppContext } from "../../shared/types/env";
import { log } from "../../shared/utils/debug";
import { ScenarioRepository } from "../../repositories/scenario.repository";

export async function handleRestart(ctx: AppContext): Promise<void> {
  const userId = ctx.from!.id;
  const chatId = ctx.chat!.id;

  // 1. Завантажуємо сценарій main
  const repo = new ScenarioRepository(ctx.env);
  const mainScenario = await repo.getScenario("main");

  if (!mainScenario) {
    log("RESTART", "CRITICAL: main scenario not found", { userId });
    return;
  }

  // 2. Встановлюємо екран (логія як у кроці 7 bot-router.ts)
  ctx.screen = {
    codeword: mainScenario.codeword,
    title: mainScenario.title,
    photo_url: mainScenario.photo_url,
    caption: {
      top: mainScenario.caption_top ?? undefined,
      mid: mainScenario.caption_mid ?? undefined,
      bot: mainScenario.caption_bot ?? undefined,
    },
    buttons: mainScenario.buttons,
    qty_options: mainScenario.qty_options,
    price: mainScenario.price,
    notify_groups: mainScenario.notify_groups,
    notify_template: mainScenario.notify_template,
    rich_message: mainScenario.rich_message,
    rich_data: mainScenario.rich_data,
  };
  log("RESTART", "screen set to main", { userId, title: mainScenario.title });

  // 3. Збираємо ID на видалення: живе повідомлення бота та саме повідомлення команди
  const idsToDelete = new Set<number>();

  if (typeof ctx.user?.message_id === "number") {
    idsToDelete.add(ctx.user.message_id);
  }

  if (typeof ctx.message?.message_id === "number") {
    idsToDelete.add(ctx.message.message_id);
  }

  if (idsToDelete.size === 0) {
    log("RESTART", "nothing to delete", { userId });
    return;
  }

  const messageIds = Array.from(idsToDelete);
  log("RESTART", "deleting messages", { chatId, messageIds });

  try {
    // Спроба батчевого видалення (патерн як у screen.ts)
    await (ctx.api as any).raw.deleteMessages({
      chat_id: chatId,
      message_ids: messageIds,
    });
  } catch (batchErr) {
    log("RESTART", "batch delete failed, trying one-by-one", { error: batchErr });
    // Фолбек: видалення по одному
    for (const id of messageIds) {
      try {
        await ctx.api.deleteMessage(chatId, id);
      } catch (singleErr) {
        log("RESTART", "single delete failed", { messageId: id, error: singleErr });
      }
    }
  }

  // 4. Скидаємо стан юзера
  ctx.user!.message_id = null;
  ctx.userDirty = true;

  log("RESTART", "completed, new message will be sent by postMiddleware", { userId });
}
