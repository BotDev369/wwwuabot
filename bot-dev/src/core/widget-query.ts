/**
 * Тап у віджеті: `widget_query` до grammY. Відповідаємо одразу (межа — 15 с),
 * потім показуємо сценарій за `data` — це і є ключ `lookup`.
 *
 * @module bot-dev/src/core/widget-query
 */

import { ScenarioRepository } from "../repositories/scenario.repository";
import { UserRepository } from "../modules/users/user.repository";
import { sendRichMessage, sendWidget, answerWidgetQuery } from "../shared/telegram/widgets";
import { hasAccess } from "@wwwuabot/shared/security/access";
import { ACCESS_DENIED } from "../shared/config/texts";
import type { Env } from "../shared/types/env";

interface WidgetQuery {
  id: string;
  from?: { id: number };
  data?: string;
  chat?: { id: number; type?: string };
  message_id?: number;
}

export async function handleWidgetQuery(env: Env, query: WidgetQuery): Promise<void> {
  const data = query.data ?? "";
  const chatId = query.chat?.id ?? query.from?.id;

  await answerWidgetQuery(env.BOT_TOKEN, query.id).catch(() => undefined);
  if (!data || !chatId || !query.from) return;

  const user = await new UserRepository(env).getUser(query.from.id);
  if (!user || !hasAccess(user, env.ADMIN_TELEGRAM_ID)) {
    await sendRich(env, chatId, ACCESS_DENIED);
    return;
  }

  const scenario = await new ScenarioRepository(env).findByLookup(data);
  if (!scenario) return;

  try {
    const sent =
      scenario.kind === "widget" && scenario.widget_html
        ? await sendWidget(env.BOT_TOKEN, {
            chatId,
            html: scenario.widget_html,
            caption: scenario.caption,
            chatData: scenario.widget_data,
            allowQueries: true,
          })
        : scenario.rich_html
          ? await sendRichMessage(env.BOT_TOKEN, chatId, scenario.rich_html)
          : null;
    if (!sent) return;

    const old = user.message_id;
    if (typeof old === "number" && old !== sent.message_id) {
      await deleteMessage(env, chatId, old);
    }
    await new UserRepository(env).updateUser(user.user_id, { message_id: sent.message_id });
    await new ScenarioRepository(env).saveMessageState(
      user.user_id,
      sent.message_id,
      "widget" in sent ? ((sent as { widget?: { id?: string } }).widget?.id ?? null) : null,
      scenario.lookup,
      scenario.widget_data,
    );
  } catch {
    // Відповідь уже пішла; мовчазний збій лишає старий екран, а не ламає апдейт.
  }
}

async function sendRich(env: Env, chatId: number, text: string): Promise<void> {
  await sendRichMessage(env.BOT_TOKEN, chatId, `<p>${text}</p>`).catch(() => undefined);
}

async function deleteMessage(env: Env, chatId: number, messageId: number): Promise<void> {
  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
  }).catch(() => undefined);
}
