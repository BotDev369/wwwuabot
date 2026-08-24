import type { AppContext } from "../../shared/types/env";
import { ScenarioRepository } from "../../repositories/scenario.repository";
import { log } from "../../shared/utils/debug";
import { handleRestart } from "./restart";
import { isRestartCommand } from "./command";
import { handleCommand } from "./command";
import { handleCallback } from "./callback";
import { handleTextInput } from "./text-input";
import { getFamilyBox, setByPath, saveFamilyBox } from "../../shared/utils/family-box";
import { dispatchAction } from "./actions";
import { getErrorMessage } from "../../core/errors";
import { UserRepository } from "../../modules/users/user.repository";

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

  // 1. Обробка сервісної команди /restart (пріоритет)
  if (isCommand && isRestartCommand(text!)) {
    await handleRestart(ctx);
    return;
  }

  // 1.5. Спеціальна обробка deep link mydate_авторизація
  if (isCommand) {
    const command = text!.split(" ")[0].split("@")[0];
    if (command === "/start") {
      const param = text!.split(" ")[1]?.trim();
      if (param === "mydate_authorization") {
        log("ROUTER", "deep link: mydate_authorization", { user_id: ctx.from?.id });
        await handleMydateAuth(ctx);
        return;
      }
    }
  }

  let codeword: string = ctx.user.active_scenario || "main";
  let actionData: string | null = null; // ← ЗМІНА: Зберігаємо дані дії, але не виконуємо її ще

  // 2. Callback-кнопка
  if (isCallback) {
    const data = ctx.callbackQuery!.data;

    if (data && data.startsWith("@")) {
      // Це ДІЯ. Зберігаємо дані і встановлюємо codeword на поточний екран
      actionData = data;
      codeword = ctx.user.active_scenario || "main";
      log("ROUTER", "type: action callback (deferred)", { data, codeword });
    } else {
      // Звичайна навігація. Відсікаємо метадані після '#'
      let pureCodeword = data || "";
      if (pureCodeword.includes("#")) {
        pureCodeword = pureCodeword.split("#")[0];
      }

      if (pureCodeword) codeword = pureCodeword;
      log("ROUTER", "type: navigation callback", { codeword, original_data: data });
    }
  }

  // 3. Команда /start
  if (isCommand) {
    const commandCodeword = handleCommand(ctx, text!);
    if (commandCodeword) {
      codeword = commandCodeword;
    }
  }

  // 3. Текстове повідомлення
  if (isPlainText) {
    const currentScenario = await repo.getScenario(ctx.user.active_scenario || "main");

    if (currentScenario) {
      const textResult = handleTextInput(ctx, text!, currentScenario);

      if (textResult.type === "record") {
        const family = textResult.family!;
        const box = getFamilyBox(ctx.user, family);
        setByPath(box, textResult.inputPath!, textResult.value);
        saveFamilyBox(ctx.user, family, box);
        ctx.userDirty = true;

        log("ROUTER", "text input saved to family box", {
          family,
          path: textResult.inputPath,
          value: textResult.value
        });

        codeword = textResult.codeword!;
      } else if (textResult.type === "navigate") {
        const found = await repo.getScenario(textResult.codeword!);
        if (found) {
          codeword = textResult.codeword!;
          log("ROUTER", "plain text matched codeword", { codeword });
        } else {
          log("ROUTER", "plain text ignored | no matching scenario", { text: textResult.codeword });
          return;
        }
      }
    }
  }

  // 4. Читаємо сценарій з БД
  log("ROUTER", "loading scenario from DB", { codeword });
  let scenario = await repo.getScenario(codeword);

  // 5. Fallback на "main"
  if (!scenario) {
    log("ROUTER", "scenario not found, fallback to main", { requested: codeword });
    console.warn(`[BotRouter] Scenario not found: "${codeword}", fallback to "main"`);
    scenario = await repo.getScenario("main");
  }

  if (!scenario) {
    log("ROUTER", "CRITICAL: main scenario not found in DB");
    console.error(`[BotRouter] Critical: "main" scenario not found in DB`);
    return;
  }

  log("ROUTER", "scenario loaded", {
    codeword: scenario.codeword,
    keyboard_type: scenario.keyboard_type,
    buttons_rows: scenario.buttons.length,
    awaits_input: scenario.awaits_input,
    input_path: scenario.input_path,
    input_next: scenario.input_next,
    price: scenario.price,
    qty_options: scenario.qty_options,
    notify_groups: scenario.notify_groups,
    notify_template: scenario.notify_template
  });

  // 6. Зберігаємо активний сценарій юзера
  if (ctx.user.active_scenario !== scenario.codeword) {
    ctx.user.active_scenario = scenario.codeword;
    ctx.userDirty = true;
  }

  // 7. Передаємо сценарій у ctx.screen
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
    rich_message: scenario.rich_message, // ← NEW
    rich_data: scenario.rich_data,       // ← NEW
  };

  // 8. ← НОВИЙ КРОК: Виконуємо відкладену дію ПІСЛЯ того, як ctx.screen заповнений
  if (actionData) {
    const handled = await dispatchAction(ctx, actionData);

    if (!handled) {
      log("ROUTER", "action not handled, ignoring callback");
      return;
    }

    log("ROUTER", "action handled, will re-render current screen", { codeword });
  }
}

/**
 * Обробка deep link mydate_authorization.
 * Відправляє вітальне повідомлення з кнопкою веб-додатку.
 */
async function handleMydateAuth(ctx: AppContext): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const userRepo = new UserRepository(ctx.env);
  const from = ctx.from;

  // Перевіряємо чи є користувач в таблиці users
  if (from?.id) {
    const existing = await userRepo.getUser(from.id);
    if (!existing) {
      log("ROUTER:mydate_auth", "creating new user", { user_id: from.id });
      await userRepo.createUser({
        user_id: from.id,
        first_name: from.first_name ?? "",
        last_name: from.last_name ?? "",
        username: from.username ?? "",
        language: from.language_code ?? "",
      });
    } else {
      log("ROUTER:mydate_auth", "user already exists", { user_id: from.id });
    }
  }

  const WEBAPP_URL = ctx.env.ENVIRONMENT === "prod"
    ? "https://wwwuabot-web-prod.diskomate.workers.dev/mydate"
    : "https://wwwuabot-web-dev.diskomate.workers.dev/mydate";

  const welcomeText =
    "<b>Вітаємо з авторизацією на wwwuabot!</b>\n\n" +
    "Тепер веб-платформа wwwuabot доступна Вам на всі 100% і не потребує від Вас введення логінів, паролів, пошту, номера телефонів, та іншу особисту інформацію.\n\n" +
    "Використовується Ваш публічний айді Телеграм для ідентифікації у веб-платформі. Безпека на вищому рівні.";

  try {
    const sent = await ctx.api.sendMessage(chatId, welcomeText, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[
          {
            text: "🌐 Відкрити сайт MyDate",
            web_app: { url: WEBAPP_URL },
          },
        ]],
      },
    });

    log("ROUTER:mydate_auth", "welcome sent", { chat_id: chatId, message_id: sent.message_id });

    // Оновлюємо активний сценарій та message_id
    if (ctx.user) {
      ctx.user.active_scenario = "mydate";
      ctx.user.message_id = sent.message_id;
      ctx.userDirty = true;
    }
  } catch (err) {
    log("ROUTER:mydate_auth", "failed to send welcome", { error: getErrorMessage(err) });
  }
}