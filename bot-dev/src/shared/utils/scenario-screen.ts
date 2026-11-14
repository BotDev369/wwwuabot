/**
 * Рендер сценарію бота: у приватному чаті — лише віджет, у групі — лише rich.
 *
 * Rich у приваті не показуємо: це інший жанр, для груп і службових екранів.
 *
 * @module bot-dev/src/shared/utils/scenario-screen
 */

import type { AppContext } from "../types/env";
import type { BotScenario } from "../types/scenario";
import { appChatData, type AppView } from "../config/app-views";
import { BRAND } from "../config/texts";
import { screenLabel } from "@wwwuabot/shared/events";
import { ScenarioRepository } from "../../repositories/scenario.repository";
import { getChat, getMe, sendRichMessage, sendWidget } from "../telegram/widgets";
import { applyPlatformUrl } from "./widget-html";
import { buildUserEvent } from "../../modules/logging/builder";
import { recordUserEvent } from "@wwwuabot/shared/database/user-events";
import { log } from "./debug";

/**
 * Показати сценарій. `view` задає відкритий вид головного віджета: той самий
 * документ, інший стартовий стан.
 */
export async function renderScenario(
  ctx: AppContext,
  scenario: BotScenario,
  view?: AppView,
): Promise<boolean> {
  if (!ctx.chat?.id) return false;

  const isPrivate = ctx.chat.type === "private";
  if (isPrivate && scenario.kind !== "widget") return false;
  if (!isPrivate && !scenario.rich_html) return false;

  const sent = isPrivate
    ? await sendWidgetSafely(ctx, scenario, view ? appChatData(view) : scenario.widget_data)
    : await sendRichSafely(ctx, scenario);

  if (!sent) return false;

  await deletePrevious(ctx, sent.message_id);

  if (ctx.user) {
    ctx.user.message_id = sent.message_id;
    ctx.userDirty = true;
    if (isPrivate) {
      await new ScenarioRepository(ctx.env)
        .saveMessageState(
          ctx.user.user_id,
          sent.message_id,
          sent.widgetId,
          scenario.lookup,
          scenario.widget_data,
        )
        .catch((error: unknown) => log("SCENARIO", "state save failed", { error: String(error) }));
    }
  }

  log("SCENARIO", "rendered", { lookup: scenario.lookup, kind: isPrivate ? "widget" : "rich" });
  return true;
}

async function sendWidgetSafely(
  ctx: AppContext,
  scenario: BotScenario,
  chatData: string | null,
): Promise<{ message_id: number; widgetId: string | null } | null> {
  if (!scenario.widget_html) return null;
  const html = applyPlatformUrl(scenario.widget_html, ctx.env.WEB_PLATFORM_URL);
  const chatId = ctx.chat!.id;
  const input = { chatId, html, chatData, allowQueries: true };
  // Дві спроби: повна й без стану та запитів. Більше — це вже вгадування
  // параметрів, а відмова завжди приходить однакова.
  const attempts: {
    label: string;
    send: () => Promise<{ message_id: number; widget?: { id?: string } }>;
  }[] = [
    { label: "prod", send: () => sendWidget(ctx.env.BOT_TOKEN, input) },
    { label: "bare", send: () => sendWidget(ctx.env.BOT_TOKEN, { chatId, html }) },
  ];

  const failures: string[] = [];
  for (const attempt of attempts) {
    try {
      const sent = await attempt.send();
      if (attempt.label !== "prod") {
        log("SCENARIO", "sendWidget passed on retry", { attempt: attempt.label });
      }
      return { message_id: sent.message_id, widgetId: sent.widget?.id ?? null };
    } catch (error: unknown) {
      failures.push(`${attempt.label}: ${String(error)}`);
      log("SCENARIO", "sendWidget attempt failed", {
        lookup: scenario.lookup,
        attempt: attempt.label,
        error: String(error),
      });
    }
  }

  const diagnostic = await describeRefusal(ctx, failures);
  log("SCENARIO", "widget refused", { diagnostic });
  await recordSendFailure(ctx, diagnostic);
  // Віджетів може не бути в цьому чаті (INPUT_MEDIA_WIDGET_NOT_ALLOWED): тоді
  // той самий старт rich-повідомленням — без звичайного тексту.
  return sendRichFallback(ctx);
}

async function sendRichSafely(
  ctx: AppContext,
  scenario: BotScenario,
): Promise<{ message_id: number; widgetId: string | null } | null> {
  if (!scenario.rich_html) return null;
  try {
    const sent = await sendRichMessage(ctx.env.BOT_TOKEN, ctx.chat!.id, scenario.rich_html);
    return { message_id: sent.message_id, widgetId: null };
  } catch (error: unknown) {
    log("SCENARIO", "sendRichMessage failed", { lookup: scenario.lookup, error: String(error) });
    return null;
  }
}

/**
 * Стартовий екран без віджета — rich-повідомленням: заголовок, бренд-рядок і
 * кнопки в розділи платформи просто в тілі. Звичайного тексту тут немає
 * взагалі: у чаті продукту кожен екран має вигляд екрана.
 */
async function sendRichFallback(
  ctx: AppContext,
): Promise<{ message_id: number; widgetId: string | null } | null> {
  const platform = ctx.env.WEB_PLATFORM_URL?.replace(/\/+$/, "");
  const link = (label: string, path: string): string =>
    `<tg-button type="url" url="${platform}${path}">${label}</tg-button>`;
  const rows: string[] = [];
  if (platform) {
    rows.push(
      `<tg-button-row>${link(screenLabel("trackers"), "/trackers")}${link(
        screenLabel("services"),
        "/services",
      )}</tg-button-row>`,
      `<tg-button-row>${link(screenLabel("assessments"), "/assessments")}${link(
        screenLabel("favorites"),
        "/favorites",
      )}</tg-button-row>`,
    );
  }
  rows.push(
    `<tg-button-row><tg-button type="callback_data" style="link" data="contacts">${screenLabel(
      "contacts",
    )}</tg-button></tg-button-row>`,
  );

  const html = `<h1>${BRAND.name}</h1><p>${BRAND.tagline}</p>${rows.join("")}`;
  try {
    const sent = await sendRichMessage(ctx.env.BOT_TOKEN, ctx.chat!.id, html);
    log("SCENARIO", "rich fallback sent", { message_id: sent.message_id });
    return { message_id: sent.message_id, widgetId: null };
  } catch (error: unknown) {
    log("SCENARIO", "rich fallback failed", { error: String(error) });
    return null;
  }
}

/**
 * Збій надсилання видно в журналі людини: `wrangler tail` живе хвилини, а
 * причина мусить лишитися, інакше «бот мовчить» неможливо розібрати.
 */
async function recordSendFailure(ctx: AppContext, error: string): Promise<void> {
  const event = buildUserEvent(ctx, "error");
  if (!event) return;
  await recordUserEvent(ctx.env.DB, { ...event, details: error.slice(0, 900) }, Date.now()).catch(
    () => undefined,
  );
}

/**
 * Чому Telegram відмовив у віджеті — у словах, а не в здогадках: хто бот, що за
 * чат і чи несуть апдейт `message_thread_id` або `business_connection_id`.
 * Саме ці два поля роблять контекст таким, де віджети заборонені.
 */
async function describeRefusal(ctx: AppContext, failures: string[]): Promise<string> {
  const message = ctx.message ?? ctx.editedMessage;
  const thread = (message as { message_thread_id?: number } | undefined)?.message_thread_id;
  const isTopic = (message as { is_topic_message?: boolean } | undefined)?.is_topic_message;
  const update = ctx.update as { business_connection_id?: string } | undefined;
  const business =
    update?.business_connection_id ??
    (message as { business_connection_id?: string } | undefined)?.business_connection_id;

  const where =
    `chat=${ctx.chat?.id ?? "?"}/${ctx.chat?.type ?? "?"}` +
    ` thread=${thread ?? "-"}` +
    ` topic=${isTopic ? 1 : 0}` +
    ` business=${business ?? "-"}`;

  const me = await getMe(ctx.env.BOT_TOKEN).then(
    (bot) => `bot=${bot.id}@${bot.username ?? "-"} topics=${bot.has_topics_enabled ? 1 : 0}`,
    (error: unknown) => `getMe: ${String(error)}`,
  );
  const chat = await getChat(ctx.env.BOT_TOKEN, ctx.chat!.id).then(
    (info) => `getChat type=${String(info.type)} id=${String(info.id)}`,
    (error: unknown) => `getChat: ${String(error)}`,
  );

  return [where, me, chat, ...failures].join(" | ");
}

/** У чаті лишається один екран бота: попередній і повідомлення людини зникають. */
async function deletePrevious(ctx: AppContext, keepId: number): Promise<void> {
  const ids: number[] = [];
  const old = ctx.user?.message_id;
  if (typeof old === "number" && old !== keepId) ids.push(old);
  if (ctx.message?.message_id) ids.push(ctx.message.message_id);
  if (ids.length === 0) return;

  try {
    await ctx.api.deleteMessages(ctx.chat!.id, ids);
  } catch (error: unknown) {
    log("SCENARIO", "old messages not deleted", { error: String(error), ids });
  }
}
