import type { AppContext } from "../../shared/types/env";
import { log } from "../../shared/utils/debug";
import { getOrCreateTopic } from "./topic-manager";
import { buildTemplateContext, renderTemplate } from "./template-engine";
import { sendNotification } from "./sender";
import { SettingsRepository } from "../../repositories/settings.repository";

/**
 * Головна функція відправки нотифікацій.
 * Огорнута в глобальний try/catch (ТЗ п. 7.1).
 * У разі будь-якої помилки — ігнорує решту груп і шле звіт ВИКЛЮЧНО в group_admin.
 */
export async function dispatchNotification(
  ctx: AppContext,
  data: Record<string, any>,
): Promise<void> {
  const screen = ctx.screen;
  if (!screen) {
    log("DISPATCHER", "no screen context");
    return;
  }

  const notifyGroups = screen.notify_groups;
  const notifyTemplate = screen.notify_template;
  if (!notifyGroups || !notifyTemplate) {
    log("DISPATCHER", "notifications not configured for this screen");
    return;
  }

  const settingsRepo = new SettingsRepository(ctx.env);

  try {
    const groups = notifyGroups
      .split(",")
      .map((g: string) => g.trim())
      .filter((g: string) => g);
    if (groups.length === 0) {
      log("DISPATCHER", "no groups specified");
      return;
    }

    const templateContext = buildTemplateContext(ctx, data);
    const messageText = renderTemplate(notifyTemplate, templateContext);

    log("DISPATCHER", "sending notifications", { groups: groups.length });

    for (const groupKey of groups) {
      const chatId = await settingsRepo.getChatId(groupKey);
      if (!chatId) {
        throw new Error(`chatId not found for group ${groupKey}`);
      }

      const topicId = await getOrCreateTopic(ctx, groupKey, chatId);
      if (!topicId) {
        throw new Error(`failed to get/create topic for ${groupKey}`);
      }

      const success = await sendNotification(ctx, chatId, messageText, topicId);
      if (!success) {
        throw new Error(`failed to send message to ${groupKey}`);
      }
    }
  } catch (err: any) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log("DISPATCHER", "fatal error, ignoring groups and sending to admin", { error: errMsg });

    // ТЗ п. 7.1: Відправка хардкодного повідомлення про помилку ВИКЛЮЧНО в group_admin
    try {
      const adminChatId = await settingsRepo.getChatId("group_admin");
      if (adminChatId) {
        const adminTopicId = await getOrCreateTopic(ctx, "group_admin", adminChatId);
        const errorText = `⚠️ Помилка нотифікації для сценарію ${screen.codeword}:\n${errMsg}`;
        await sendNotification(ctx, adminChatId, errorText, adminTopicId || undefined);
      } else {
        log("DISPATCHER", "CRITICAL: group_admin not found in settings");
      }
    } catch (adminErr) {
      log("DISPATCHER", "CRITICAL: Failed to send error to admin", { error: String(adminErr) });
    }
  }
}
