/**
 * Рендер сценарію бота: у приватному чаті — лише віджет, у групі — лише rich.
 *
 * Rich у приваті не показуємо: це інший жанр, для груп і службових екранів.
 *
 * @module bot-dev/src/shared/utils/scenario-screen
 */

import type { InlineKeyboardButton } from "grammy/types";
import type { AppContext } from "../types/env";
import type { BotScenario } from "../types/scenario";
import { appChatData, type AppView } from "../config/app-views";
import { BRAND } from "../config/texts";
import { screenLabel } from "@wwwuabot/shared/events";
import { ScenarioRepository } from "../../repositories/scenario.repository";
import { sendRichMessage, sendWidget } from "../telegram/widgets";
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
  const attempts: { label: string; input: Parameters<typeof sendWidget>[1] }[] = [
    { label: "full", input: { chatId, html, chatData, allowQueries: true } },
    { label: "no-queries", input: { chatId, html, chatData } },
    { label: "bare", input: { chatId, html } },
  ];

  const failures: string[] = [];
  for (const attempt of attempts) {
    try {
      const sent = await sendWidget(ctx.env.BOT_TOKEN, attempt.input);
      if (attempt.label !== "full") {
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

  await recordSendFailure(ctx, `${ctx.chat?.type ?? "?"} | ${failures.join(" | ")}`);
  // Віджетів може не бути в цьому чаті (INPUT_MEDIA_WIDGET_NOT_ALLOWED): тоді
  // краще картка з тими самими входами, ніж тиша.
  return sendTextFallback(ctx);
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
 * Той самий старт без віджета: бренд-рядок і кнопки в розділи платформи.
 * Використовується лише тоді, коли сервер відмовив у надсиланні віджета.
 */
async function sendTextFallback(
  ctx: AppContext,
): Promise<{ message_id: number; widgetId: string | null } | null> {
  const platform = ctx.env.WEB_PLATFORM_URL?.replace(/\/+$/, "");
  // Підписи — зі спільних назв екранів, а не нові рядки: той самий словник,
  // що й у журналі платформи, тож кнопка й екран звуться однаково.
  const rows: InlineKeyboardButton[][] = [];
  if (platform) {
    rows.push(
      [
        { text: screenLabel("trackers"), url: `${platform}/trackers` },
        { text: screenLabel("services"), url: `${platform}/services` },
      ],
      [
        { text: screenLabel("assessments"), url: `${platform}/assessments` },
        { text: screenLabel("favorites"), url: `${platform}/favorites` },
      ],
    );
  }
  rows.push([{ text: screenLabel("contacts"), callback_data: "contacts" }]);

  try {
    const sent = await ctx.api.sendMessage(ctx.chat!.id, `${BRAND.name} — ${BRAND.tagline}`, {
      reply_markup: { inline_keyboard: rows },
    });
    log("SCENARIO", "text fallback sent", { message_id: sent.message_id });
    return { message_id: sent.message_id, widgetId: null };
  } catch (error: unknown) {
    log("SCENARIO", "text fallback failed", { error: String(error) });
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
  await recordUserEvent(ctx.env.DB, { ...event, details: error.slice(0, 300) }, Date.now()).catch(
    () => undefined,
  );
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
