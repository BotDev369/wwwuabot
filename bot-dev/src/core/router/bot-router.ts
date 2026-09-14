import type { AppContext } from "../../shared/types/env";
import { ScenarioRepository } from "../../repositories/scenario.repository";
import { log } from "../../shared/utils/debug";
import { handleTextInput } from "./text-input";
import { isValidBotPayload, isValidSlug, toWebPath } from "@wwwuabot/shared/content";

/**
 * Головний роутер бота.
 * Бот — pure renderer: бере контент із таблиці scenarios і показує.
 *
 * Потоки:
 * 1. /start <payload> → shared resolver → сторінка → рендер
 * 2. /start без payload → головна сторінка
 * 3. callback_data → slug → рендер
 * 4. текст → ТІЛЬКИ якщо awaits_input, інакше видаляємо
 */
export async function botRouter(ctx: AppContext): Promise<void> {
  if (!ctx.user) return;

  const repo = new ScenarioRepository(ctx.env);
  const text = ctx.message?.text;
  const isCallback = !!ctx.callbackQuery;
  const isCommand = !!text?.startsWith("/");
  const isPlainText = !isCallback && !isCommand && !!text;

  if (!isCallback && !isCommand && !isPlainText) {
    log("ROUTER", "ignored | no actionable content");
    return;
  }

  if (isCommand) {
    const command = text!.split(" ")[0].split("@")[0];
    if (command === "/start") {
      const payload = text!.split(" ")[1]?.trim() ?? "";
      if (payload && !isValidBotPayload(payload)) {
        log("ROUTER", "deep link rejected | invalid payload", { payload });
        await deleteUserMessage(ctx);
        return;
      }
      log("ROUTER", "deep link", { payload, user_id: ctx.from?.id });
      await loadAndRenderPayload(ctx, repo, payload);
      return;
    }
  }

  if (isCallback) {
    let slug = ctx.callbackQuery!.data || "";
    if (slug.includes("#")) slug = slug.split("#")[0];

    if (isValidSlug(slug)) {
      log("ROUTER", "callback navigation", { slug });
      await loadAndRenderScenario(ctx, repo, slug);
    } else {
      log("ROUTER", "callback rejected | invalid slug", { data: ctx.callbackQuery!.data });
    }
    return;
  }

  if (isPlainText) {
    const currentScenario = await repo.getScenario(ctx.user.active_scenario || "");

    if (currentScenario?.awaits_input === "text") {
      const result = handleTextInput(text!, currentScenario);
      if (result.type === "accept") {
        log("ROUTER", "text input accepted", { value: result.value });
        await loadAndRenderScenario(ctx, repo, currentScenario.slug);
        return;
      }
    }

    log("ROUTER", "text input ignored | no awaits_input", {
      text: text!.substring(0, 50),
      active_scenario: ctx.user.active_scenario,
    });
    await deleteUserMessage(ctx);
  }
}

async function loadAndRenderPayload(
  ctx: AppContext,
  repo: ScenarioRepository,
  payload: string,
): Promise<void> {
  const scenario = await repo.getScenarioByBotPayload(payload);
  if (!scenario) {
    log("ROUTER", "scenario not found", { payload });
    await deleteUserMessage(ctx);
    return;
  }
  setScenarioScreen(ctx, scenario, scenario.web_path);
}

async function loadAndRenderScenario(
  ctx: AppContext,
  repo: ScenarioRepository,
  slug: string,
): Promise<void> {
  const scenario = await repo.getScenario(slug);
  if (!scenario) {
    log("ROUTER", "scenario not found", { slug });
    await deleteUserMessage(ctx);
    return;
  }
  setScenarioScreen(ctx, scenario);
}

function setScenarioScreen(
  ctx: AppContext,
  scenario: import("../../shared/types/scenario").Scenario,
  webPath?: string,
): void {
  log("ROUTER", "scenario loaded", {
    slug: scenario.slug,
    keyboard_type: scenario.keyboard_type,
    buttons_rows: scenario.buttons.length,
    awaits_input: scenario.awaits_input,
    rich_message: scenario.rich_message,
  });

  if (ctx.user && ctx.user.active_scenario !== scenario.slug) {
    ctx.user.active_scenario = scenario.slug;
    ctx.userDirty = true;
  }

  const routePath = webPath ?? toWebPath(scenario.slug);

  ctx.screen = {
    slug: scenario.slug,
    title: scenario.title,
    photo_url: scenario.photo_url,
    caption: {
      top: scenario.caption_top ?? undefined,
      mid: scenario.caption_mid ?? undefined,
      bot: scenario.caption_bot ?? undefined,
    },
    buttons: scenario.buttons,
    qty_options: scenario.qty_options,
    price: scenario.price,
    notify_groups: scenario.notify_groups,
    notify_template: scenario.notify_template,
    rich_message: scenario.rich_message,
    rich_data: scenario.rich_data,
    web_path: routePath,
  };
}

async function deleteUserMessage(ctx: AppContext): Promise<void> {
  if (!ctx.message?.message_id || !ctx.chat?.id) return;

  try {
    await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);
    log("ROUTER", "deleted unprocessed user message", { message_id: ctx.message.message_id });
  } catch {
    log("ROUTER", "failed to delete user message (non-critical)");
  }
}
