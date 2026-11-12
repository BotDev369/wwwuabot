/**
 * Рендер сценарію бота: у приватному чаті — лише віджет, у групі — лише rich.
 *
 * Rich у приваті не показуємо: це інший жанр, для груп і службових екранів.
 *
 * @module bot-dev/src/shared/utils/scenario-screen
 */

import type { AppContext } from "../types/env";
import type { BotScenario } from "../types/scenario";
import { ScenarioRepository } from "../../repositories/scenario.repository";
import { sendRichMessage, sendWidget } from "../telegram/widgets";
import { log } from "./debug";

export async function renderScenario(ctx: AppContext, scenario: BotScenario): Promise<boolean> {
  if (!ctx.chat?.id) return false;

  const isPrivate = ctx.chat.type === "private";
  if (isPrivate && scenario.kind !== "widget") return false;
  if (!isPrivate && !scenario.rich_html) return false;

  const sent = isPrivate
    ? await sendWidgetSafely(ctx, scenario)
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
): Promise<{ message_id: number; widgetId: string | null } | null> {
  if (!scenario.widget_html) return null;
  try {
    const sent = await sendWidget(ctx.env.BOT_TOKEN, {
      chatId: ctx.chat!.id,
      html: scenario.widget_html,
      caption: scenario.caption,
      chatData: scenario.widget_data,
      allowQueries: true,
    });
    return { message_id: sent.message_id, widgetId: sent.widget?.id ?? null };
  } catch (error: unknown) {
    // Запасного rich немає: у приваті він заборонений, тож збій лишає старий екран.
    log("SCENARIO", "sendWidget failed", { lookup: scenario.lookup, error: String(error) });
    return null;
  }
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
