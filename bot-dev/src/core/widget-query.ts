/**
 * Тап у віджеті: `widget_query` до grammY. Відповідаємо одразу (межа — 15 с),
 * потім показуємо сценарій за `data` — це і є ключ `lookup`.
 *
 * @module bot-dev/src/core/widget-query
 */

import { ScenarioRepository } from "../repositories/scenario.repository";
import { UserRepository } from "../modules/users/user.repository";
import { sendWidget, answerWidgetQuery } from "../shared/telegram/widgets";
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
    await sendDenied(env, chatId);
    return;
  }

  const scenario = await new ScenarioRepository(env).findByLookup(data);
  if (!scenario) return;

  try {
    if (scenario.kind !== "widget" || !scenario.widget_html) return;
    const sent = await sendWidget(env.BOT_TOKEN, {
      chatId,
      html: scenario.widget_html,
      caption: scenario.caption,
      chatData: scenario.widget_data,
      allowQueries: true,
    });

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

/** Відмова — теж віджет: у приватному чаті інших повідомлень не показуємо. */
async function sendDenied(env: Env, chatId: number): Promise<void> {
  const text = ACCESS_DENIED.split("\n")
    .filter(Boolean)
    .map((line) => `<p>${line.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`)
    .join("");
  const html =
    '<style>body{margin:0;padding:18px 16px;background:#fdf7ea;color:#16233a;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}p{margin:0 0 10px}</style>' +
    text;
  await sendWidget(env.BOT_TOKEN, { chatId, html, allowQueries: false }).catch(() => undefined);
}

async function deleteMessage(env: Env, chatId: number, messageId: number): Promise<void> {
  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
  }).catch(() => undefined);
}
