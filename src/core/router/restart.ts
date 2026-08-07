import type { AppContext } from '../../shared/types/env';
import { log } from '../../shared/utils/debug';

export async function handleRestart(ctx: AppContext): Promise<void> {
  const userId = ctx.from!.id;
  const chatId = ctx.chat!.id;
  
  // Збираємо ID на видалення: живе повідомлення бота та саме повідомлення команди
  const idsToDelete = new Set<number>();
  
  if (typeof ctx.user?.message_id === 'number') {
    idsToDelete.add(ctx.user.message_id);
  }
  
  if (typeof ctx.message?.message_id === 'number') {
    idsToDelete.add(ctx.message.message_id);
  }
  
  if (idsToDelete.size === 0) {
    log('RESTART', 'nothing to delete', { userId });
    return;
  }
  
  const messageIds = Array.from(idsToDelete);
  log('RESTART', 'deleting messages', { chatId, messageIds });
  
  try {
    // Спроба батчевого видалення (патерн як у screen.ts)
    await (ctx.api as any).raw.deleteMessages({
      chat_id: chatId,
      message_ids: messageIds,
    });
  } catch (batchErr) {
    log('RESTART', 'batch delete failed, trying one-by-one', { error: batchErr });
    // Фолбек: видалення по одному
    for (const id of messageIds) {
      try {
        await ctx.api.deleteMessage(chatId, id);
      } catch (singleErr) {
        log('RESTART', 'single delete failed', { messageId: id, error: singleErr });
      }
    }
  }
  
  // Скидаємо стан юзера
  ctx.user!.message_id = null;
  ctx.userDirty = true;
  
  // ctx.screen НЕ ставимо — юзер залишається без екрана (стан "START")
  log('RESTART', 'completed', { userId });
}
