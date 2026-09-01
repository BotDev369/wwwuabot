import type { AppContext } from "../../shared/types/env";
import { log } from "../../shared/utils/debug";

/**
 * Формує назву топіка з обмеженням 128 символів.
 * Формат: "{user_id} - {first_name} {last_name} - @{username}"
 */
function buildTopicName(ctx: AppContext): string {
  const user = ctx.from!;
  const userId = user.id;
  const firstName = user.first_name || "...";
  const lastName = user.last_name || "...";
  const username = user.username ? `@${user.username}` : "без username";

  const fullName = `${userId} - ${firstName} ${lastName} - ${username}`;

  // Ліміт Telegram: 128 символів
  if (fullName.length <= 128) {
    return fullName;
  }

  // Обрізаємо до 125 символів і додаємо "..."
  return fullName.substring(0, 125) + "...";
}

/**
 * Отримує або створює topic_id для конкретної групи.
 * Повертає topic_id або null, якщо не вдалося створити.
 */
export async function getOrCreateTopic(
  ctx: AppContext,
  groupKey: string,
  chatId: string,
): Promise<number | null> {
  const user = ctx.user!;

  // Парсимо topics з JSON
  let topics: Record<string, number> = {};
  if (user.topics) {
    try {
      topics = JSON.parse(user.topics);
    } catch (err) {
      log("TOPIC_MANAGER", "failed to parse topics JSON, resetting", { error: String(err) });
      topics = {};
    }
  }

  // Перевіряємо чи topic_id вже існує
  if (topics[groupKey]) {
    log("TOPIC_MANAGER", "topic exists", { groupKey, topic_id: topics[groupKey] });
    return topics[groupKey];
  }

  // Створюємо новий топик
  log("TOPIC_MANAGER", "creating new topic", { groupKey, chatId });

  try {
    const topicName = buildTopicName(ctx);

    const response = await ctx.api.createForumTopic(chatId, topicName);
    const topicId = response.message_thread_id!;

    log("TOPIC_MANAGER", "topic created", { groupKey, topic_id: topicId, name: topicName });

    // Зберігаємо topic_id в user.topics
    topics[groupKey] = topicId;
    user.topics = JSON.stringify(topics);
    ctx.userDirty = true;

    return topicId;
  } catch (err) {
    log("TOPIC_MANAGER", "failed to create topic", {
      groupKey,
      chatId,
      error: String(err),
    });
    return null;
  }
}
