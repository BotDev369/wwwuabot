/**
 * Тап у віджеті: `widget_query` до grammY. Відповідаємо одразу (межа — 15 с).
 *
 * Навігація в головному документі не надсилає нічого нового: бот міняє
 * `chat_data`, і віджет перемальовує вид. Якщо повідомлення вже немає —
 * документ надсилається з потрібним видом як стартовим станом.
 * @module bot-dev/src/core/widget-query
 */

import { ScenarioRepository } from "../repositories/scenario.repository";
import { UserRepository } from "../modules/users/user.repository";
import {
  sendWidget,
  answerWidgetQuery,
  editMessageWidgetData,
  type SentWidget,
} from "../shared/telegram/widgets";
import { APP_LOOKUP, appChatData, isAppView, type AppView } from "../shared/config/app-views";
import { hasAccess } from "@wwwuabot/shared/security/access";
import { ACCESS_DENIED } from "../shared/config/texts";
import { applyPlatformUrl } from "../shared/utils/widget-html";
import { log } from "../shared/utils/debug";
import type { Env } from "../shared/types/env";
import type { BotScenario } from "../shared/types/scenario";

interface WidgetQuery {
  id: string;
  from?: { id: number };
  data?: string;
  chat?: { id: number; type?: string };
  message_id?: number;
  inline_message_id?: string;
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

  const repo = new ScenarioRepository(env);
  try {
    if (isAppView(data)) {
      await openView(env, repo, user.user_id, chatId, data as AppView, query);
      return;
    }

    const scenario = await repo.findByLookup(data);
    if (!scenario) return;
    await sendScreen(env, repo, user, chatId, scenario, scenario.widget_data);
  } catch {
    // Відповідь уже пішла; мовчазний збій лишає старий екран, а не ламає апдейт.
  }
}

/** Вид головного віджета: спершу правимо стан наявного повідомлення. */
async function openView(
  env: Env,
  repo: ScenarioRepository,
  userId: number,
  chatId: number,
  view: AppView,
  query: WidgetQuery,
): Promise<void> {
  const app = await repo.findByLookup(APP_LOOKUP);
  if (!app?.widget_html) return;

  const chatData = appChatData(view);
  const state = await repo.getMessageState(userId);

  if (state?.lookup === APP_LOOKUP && !query.inline_message_id) {
    const edited = await editMessageWidgetData(
      env.BOT_TOKEN,
      chatId,
      state.message_id,
      chatData,
    ).then(
      () => true,
      (error: unknown) => {
        log("WIDGET", "state edit failed, sending anew", { error: String(error) });
        return false;
      },
    );
    if (edited) {
      await repo.saveMessageState(userId, state.message_id, state.widget_id, APP_LOOKUP, chatData);
      log("WIDGET", "view changed in place", { view });
      return;
    }
  }

  const sent = await sendWidget(env.BOT_TOKEN, {
    chatId,
    html: applyPlatformUrl(app.widget_html, env.WEB_PLATFORM_URL),
    chatData,
    allowQueries: true,
  });
  await remember(env, repo, userId, chatId, sent, APP_LOOKUP, chatData);
  log("WIDGET", "view sent as new widget", { view });
}

/** Окремий сценарій: новий екран і прибирання попереднього після успіху. */
async function sendScreen(
  env: Env,
  repo: ScenarioRepository,
  user: { user_id: number; message_id?: number | null },
  chatId: number,
  scenario: BotScenario,
  chatData: string | null,
): Promise<void> {
  if (!scenario.widget_html) return;

  const sent = await sendWidget(env.BOT_TOKEN, {
    chatId,
    html: applyPlatformUrl(scenario.widget_html, env.WEB_PLATFORM_URL),
    chatData,
    allowQueries: true,
  });
  await remember(env, repo, user.user_id, chatId, sent, scenario.lookup, chatData);
  log("WIDGET", "screen sent", { lookup: scenario.lookup });
}

async function remember(
  env: Env,
  repo: ScenarioRepository,
  userId: number,
  chatId: number,
  sent: SentWidget,
  lookup: string,
  chatData: string | null,
): Promise<void> {
  const old = (await new UserRepository(env).getUser(userId))?.message_id;
  if (typeof old === "number" && old !== sent.message_id) {
    await deleteMessage(env, chatId, old);
  }
  await new UserRepository(env).updateUser(userId, { message_id: sent.message_id });
  await repo.saveMessageState(userId, sent.message_id, sent.widget?.id ?? null, lookup, chatData);
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
