import type { AppContext } from "../../shared/types/env";
import type { Scenario } from "../../shared/types/scenario";
import { ScenarioRepository } from "../../repositories/scenario.repository";
import { log } from "../../shared/utils/debug";
import { handleRestart } from "./restart";
import { isRestartCommand } from "./command";
import { handleTextInput } from "./text-input";
import { getFamilyBox, setByPath, saveFamilyBox } from "../../shared/utils/family-box";
import { dispatchAction } from "./actions";

/**
 * Головний роутер бота.
 * Бот — pure renderer: бере контент із таблиці scenarios і показує.
 * Жодної хардкод-логіки для контенту.
 *
 * Потоки:
 * 1. /start?<codeword>  → deep link: завантажуємо сценарій → рендер
 * 2. /start             → завантажуємо "main" сценарій → рендер
 * 3. callback_data      → якщо @... → action, інакше codeword → рендер
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

  // ── 1. Сервісна команда /restart ────────────────────────────
  if (isCommand && isRestartCommand(text!)) {
    await handleRestart(ctx);
    return;
  }

  // ── 2. /start (з deep link або без) ──────────────────────────
  if (isCommand) {
    const command = text!.split(" ")[0].split("@")[0];
    if (command === "/start") {
      const param = text!.split(" ")[1]?.trim();
      if (param) {
        // Deep link: /start?galyashop_astragal
        log("ROUTER", "deep link", { codeword: param, user_id: ctx.from?.id });
        await loadAndRenderScenario(ctx, repo, param);
        return;
      }
      // /start без параметра → показуємо "main"
      await loadAndRenderScenario(ctx, repo, "main");
      return;
    }
  }

  // ── 3. Callback ──────────────────────────────────────────────
  if (isCallback) {
    const data = ctx.callbackQuery!.data;

    if (data && data.startsWith("@")) {
      // Action callback: @action:target:param → виконуємо дію
      // Спочатку встановлюємо ctx.screen з поточного сценарію,
      // потім dispatchAction працює з ним
      const currentCodeword = ctx.user.active_scenario || "main";
      await loadScenarioToScreen(ctx, repo, currentCodeword);

      if (ctx.screen) {
        const handled = await dispatchAction(ctx, data);
        if (!handled) {
          log("ROUTER", "action not handled, ignoring", { data });
          return;
        }
        log("ROUTER", "action handled, re-rendering", { data });
      }
      return;
    }

    // Navigation callback: callback_data = codeword
    let pureCodeword = data || "";
    if (pureCodeword.includes("#")) {
      pureCodeword = pureCodeword.split("#")[0];
    }

    if (pureCodeword) {
      log("ROUTER", "callback navigation", { codeword: pureCodeword });
      await loadAndRenderScenario(ctx, repo, pureCodeword);
    }
    return;
  }

  // ── 4. Текстове повідомлення ────────────────────────────────
  if (isPlainText) {
    const currentScenario = await repo.getScenario(ctx.user.active_scenario || "main");

    // Обробляємо текст ТІЛЬКИ якщо сценарій очікує ввід
    if (currentScenario?.awaits_input === "text" && currentScenario.input_path) {
      const textResult = handleTextInput(ctx, text!, currentScenario);

      if (textResult.type === "record") {
        const family = textResult.family!;
        const box = getFamilyBox(ctx.user, family);
        setByPath(box, textResult.inputPath!, textResult.value);
        saveFamilyBox(ctx.user, family, box);
        ctx.userDirty = true;

        log("ROUTER", "text input recorded", {
          family,
          path: textResult.inputPath,
          value: textResult.value,
        });

        // Переходимо на наступний сценарій після запису
        await loadAndRenderScenario(ctx, repo, textResult.codeword!);
        return;
      }
    }

    // Текст НЕ обробляється як навігація — видаляємо, але логуємо
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
 * Після цього postMiddleware відрендерить через sendOrEditLiveMessage.
 */
async function loadAndRenderScenario(
  ctx: AppContext,
  repo: ScenarioRepository,
  codeword: string,
): Promise<void> {
  const scenario = await repo.getScenario(codeword);

  if (!scenario) {
    log("ROUTER", "scenario not found", { codeword });
    await sendNotFound(ctx, codeword);
    return;
  }

  setScenarioScreen(ctx, scenario);
}

/**
 * Завантажує сценарій в ctx.screen БЕЗ встановлення active_scenario.
 * Використовується для action callbacks, де поточний екран не змінюється.
 */
async function loadScenarioToScreen(
  ctx: AppContext,
  repo: ScenarioRepository,
  codeword: string,
): Promise<void> {
  const scenario = await repo.getScenario(codeword);
  if (!scenario) {
    log("ROUTER", "scenario not found for screen", { codeword });
    return;
  }
  setScenarioScreen(ctx, scenario);
}

/**
 * Встановлює ctx.screen з сценарію. Pure function — тільки записує в контекст.
 */
function setScenarioScreen(ctx: AppContext, scenario: Scenario): void {
  log("ROUTER", "scenario loaded", {
    codeword: scenario.codeword,
    keyboard_type: scenario.keyboard_type,
    buttons_rows: scenario.buttons.length,
    awaits_input: scenario.awaits_input,
    rich_message: scenario.rich_message,
  });

  // Оновлюємо активний сценарій
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
 * Відправляє повідомлення "не знайдено" з кнопкою на main.
 */
async function sendNotFound(ctx: AppContext, requestedCodeword: string): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  try {
    const sent = await ctx.api.sendMessage(
      chatId,
      `<b>Сторінку не знайдено</b>\n\nКодове слово <code>${escapeHtml(requestedCodeword)}</code> відсутнє в базі.`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "🏠 Головна", callback_data: "main" }]],
        },
      },
    );

    if (ctx.user) {
      ctx.user.message_id = sent.message_id;
      ctx.userDirty = true;
    }
  } catch (err) {
    log("ROUTER", "failed to send not-found message", { error: String(err) });
  }
}

/**
 * Видаляє повідомлення користувача (текст, який не був оброблений).
 */
async function deleteUserMessage(ctx: AppContext): Promise<void> {
  if (!ctx.message?.message_id || !ctx.chat?.id) return;

  try {
    await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);
    log("ROUTER", "deleted unprocessed user message", { message_id: ctx.message.message_id });
  } catch {
    // Можливо, повідомлення вже видалене або бот не має прав
    log("ROUTER", "failed to delete user message (non-critical)");
  }
}

/**
 * Escape HTML-символи для безпечної вставки в Telegram HTML.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
