import type { AppContext } from "../../shared/types/env";
import type { Scenario } from "../../shared/types/scenario";
import { ScenarioRepository } from "../../repositories/scenario.repository";
import { log } from "../../shared/utils/debug";
import { handleTextInput } from "./text-input";
import { validateCodeword } from "../../modules/security/input-validation";

/**
 * Головний роутер бота.
 * Бот — pure renderer: бере контент із таблиці scenarios і показує.
 *
 * Потоки:
 * 1. /start?<codeword>  → deep link: завантажуємо сценарій → рендер
 * 2. /start             → завантажуємо "main" сценарій → рендер
 * 3. callback_data      → codeword → рендер
 * 4. текст              → ТІЛЬКИ якщо awaits_input, інакше видаляємо
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

  // ── 1. /start (з deep link або без) ──────────────────────────
  if (isCommand) {
    const command = text!.split(" ")[0].split("@")[0];
    if (command === "/start") {
      const param = text!.split(" ")[1]?.trim();
      if (param) {
        // SEC-3: Валідуємо codeword з deep link
        const validatedCodeword = validateCodeword(param);
        if (!validatedCodeword) {
          log("ROUTER", "deep link rejected | invalid codeword", { param });
          await deleteUserMessage(ctx);
          return;
        }
        log("ROUTER", "deep link", { codeword: validatedCodeword, user_id: ctx.from?.id });
        await loadAndRenderScenario(ctx, repo, validatedCodeword);
        return;
      }
      // /start без параметра → показуємо "main"
      await loadAndRenderScenario(ctx, repo, "main");
      return;
    }
  }

  // ── 2. Callback ──────────────────────────────────────────────
  if (isCallback) {
    const data = ctx.callbackQuery!.data;

    // Navigation callback: callback_data = codeword
    let pureCodeword = data || "";
    if (pureCodeword.includes("#")) {
      pureCodeword = pureCodeword.split("#")[0];
    }

    // SEC-3: Валідуємо codeword з callback
    const validatedCallbackCodeword = validateCodeword(pureCodeword);
    if (validatedCallbackCodeword) {
      log("ROUTER", "callback navigation", { codeword: validatedCallbackCodeword });
      await loadAndRenderScenario(ctx, repo, validatedCallbackCodeword);
    } else {
      log("ROUTER", "callback rejected | invalid codeword", { data });
    }
    return;
  }

  // ── 3. Текстове повідомлення ────────────────────────────────
  if (isPlainText) {
    const currentScenario = await repo.getScenario(ctx.user.active_scenario || "main");

    if (currentScenario?.awaits_input === "text") {
      // Текст прийнято (сценарій очікує ввід) — просто логуємо
      const result = handleTextInput(text!, currentScenario);
      if (result.type === "accept") {
        log("ROUTER", "text input accepted", { value: result.value });
        // Показуємо той самий сценарій
        await loadAndRenderScenario(ctx, repo, ctx.user.active_scenario || "main");
        return;
      }
    }

    // Текст НЕ обробляється — видаляємо, але логуємо
    log("ROUTER", "text input ignored | no awaits_input", {
      text: text!.substring(0, 50),
      active_scenario: ctx.user.active_scenario,
    });
    await deleteUserMessage(ctx);
    return;
  }
}

// ═══════════════════════════════════════════════════════════════
// Допоміжні функції
// ═══════════════════════════════════════════════════════════════

/**
 * Завантажує сценарій з БД, ставить ctx.screen і оновлює active_scenario.
 */
async function loadAndRenderScenario(
  ctx: AppContext,
  repo: ScenarioRepository,
  codeword: string,
): Promise<void> {
  const scenario = await repo.getScenario(codeword);

  if (!scenario) {
    log("ROUTER", "scenario not found", { codeword });
    // Видаляємо вхідне повідомлення (наприклад /start?codeword)
    await deleteUserMessage(ctx);
    return;
  }

  setScenarioScreen(ctx, scenario);
}

/**
 * Встановлює ctx.screen з сценарію.
 */
function setScenarioScreen(ctx: AppContext, scenario: Scenario): void {
  log("ROUTER", "scenario loaded", {
    codeword: scenario.codeword,
    keyboard_type: scenario.keyboard_type,
    buttons_rows: scenario.buttons.length,
    awaits_input: scenario.awaits_input,
    rich_message: scenario.rich_message,
  });

  if (ctx.user && ctx.user.active_scenario !== scenario.codeword) {
    ctx.user.active_scenario = scenario.codeword;
    ctx.userDirty = true;
  }

  ctx.screen = {
    codeword: scenario.codeword,
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
  };
}



/**
 * Видаляє повідомлення користувача.
 */
async function deleteUserMessage(ctx: AppContext): Promise<void> {
  if (!ctx.message?.message_id || !ctx.chat?.id) return;

  try {
    await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);
    log("ROUTER", "deleted unprocessed user message", { message_id: ctx.message.message_id });
  } catch {
    log("ROUTER", "failed to delete user message (non-critical)");
  }
}
