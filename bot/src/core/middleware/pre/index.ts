import { Composer } from "grammy";
import type { AppContext } from "../../../shared/types/env";
import type { Scenario } from "../../../shared/types/scenario";
import { filterUpdates } from "./filter-updates";
import { UserRepository } from "../../../modules/users/user.repository";
import { ScenarioRepository } from "../../../repositories/scenario.repository";
import { isUserBlocked } from "../../../modules/security/blocked-users";
import { checkRateLimit } from "../../../modules/security/rate-limiter";
import { log } from "../../../shared/utils/debug";
import { sendOrEditLiveMessage } from "../../../shared/utils/screen";

export const preMiddleware = new Composer<AppContext>();

// ── 1. Миттєва відповідь на callback_query (Telegram вимагає протягом 30с) ──
preMiddleware.use(async (ctx, next) => {
  if (ctx.callbackQuery) {
    try {
      await ctx.answerCallbackQuery();
      log("PRE:callback", "answered immediately");
    } catch (err) {
      log("PRE:callback", "failed to answer", { error: String(err) });
    }
  }
  await next();
});

// ── 2. Фільтрація непотрібних апдейтів (edited_message, channel_post) ──
preMiddleware.use(filterUpdates);

// ── 3. Завантаження/створення користувача ──
preMiddleware.use(async (ctx, next) => {
  if (!ctx.from) {
    log("PRE:user", "skipped | reason: no ctx.from");
    return next();
  }

  const repo = new UserRepository(ctx.env);
  let user = await repo.getUser(ctx.from.id);

  if (!user) {
    await repo.createUser({
      user_id: ctx.from.id,
      first_name: ctx.from.first_name || "...",
      last_name: ctx.from.last_name || "...",
      username: ctx.from.username || "...",
      language: ctx.from.language_code || "...",
    });
    user = await repo.getUser(ctx.from.id);
    log("PRE:user", "created new user", { user_id: ctx.from.id });
  } else {
    const newFirst = ctx.from.first_name || "...";
    const newLast = ctx.from.last_name || "...";
    const newUser = ctx.from.username || "...";
    const newLang = ctx.from.language_code || "...";

    const changed: string[] = [];
    if (user.first_name !== newFirst) changed.push("first_name");
    if (user.last_name !== newLast) changed.push("last_name");
    if (user.username !== newUser) changed.push("username");
    if (user.language !== newLang) changed.push("language");

    if (changed.length > 0) {
      user.first_name = newFirst;
      user.last_name = newLast;
      user.username = newUser;
      user.language = newLang;
      ctx.userDirty = true;
      log("PRE:user", "loaded | profile updated", { user_id: ctx.from.id, changed });
    } else {
      log("PRE:user", "loaded", {
        user_id: ctx.from.id,
        active_scenario: user.active_scenario,
        message_id: user.message_id,
      });
    }
  }

  ctx.user = user;
  ctx.userDirty = ctx.userDirty || false;

  await next();
});

// ── 4a. SEC-2: Розблокування — якщо був заблокований, але тепер ні → показуємо "unblocked" ОДИН РАЗ ──
preMiddleware.use(async (ctx, next) => {
  const wasBlocked = ctx.user?.active_scenario === "blocked";
  const isNowBlocked = isUserBlocked(ctx);

  if (wasBlocked && !isNowBlocked) {
    // Адмін розблокував — показуємо "unblocked" сценарій ОДИН РАЗ
    log("SEC:blocked", "user unblocked, showing unblocked message", { user_id: ctx.user?.user_id });

    const repo = new ScenarioRepository(ctx.env);
    const scenario = await repo.getScenario("unblocked");

    if (scenario) {
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
    } else {
      // Fallback якщо сценарій "unblocked" не створено в БД
      ctx.screen = {
        codeword: "unblocked",
        caption: { mid: "✅ Ваш акаунт розблоковано." },
        buttons: [],
      };
    }

    ctx.user!.active_scenario = scenario?.codeword ?? "unblocked";
    ctx.userDirty = true;

    // Рендеримо напряму
    await sendOrEditLiveMessage(ctx);

    // Зберігаємо стан
    if (ctx.userDirty && ctx.from) {
      const updates: Record<string, any> = {};
      for (const [key, value] of Object.entries(ctx.user!)) {
        if (key !== "user_id") {
          updates[key] = typeof value === "object" && value !== null ? JSON.stringify(value) : value;
        }
      }
      const userRepo = new UserRepository(ctx.env);
      await userRepo.updateUser(ctx.from.id, updates);
      log("SEC:blocked", "saved unblocked state to DB", { user_id: ctx.user?.user_id });
    }

    return;
  }

  await next();
});

// ── 4b. SEC-2: Блокування — показуємо "blocked" сценарій ОДИН РАЗ, потім тихо ──
preMiddleware.use(async (ctx, next) => {
  if (!isUserBlocked(ctx)) {
    await next();
    return;
  }

  // Якщо вже показали "blocked" — ігноруємо повністю
  if (ctx.user && ctx.user.active_scenario === "blocked") {
    log("SEC:blocked", "already shown, ignoring", { user_id: ctx.user.user_id });
    return;
  }

  // Показуємо "blocked" сценарій ОДИН РАЗ
  if (ctx.user) {
    const repo = new ScenarioRepository(ctx.env);
    const scenario = await repo.getScenario("blocked");

    if (scenario) {
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
    } else {
      // Fallback якщо сценарій "blocked" не створено в БД
      ctx.screen = {
        codeword: "blocked",
        caption: { mid: "⚠️ Ваш акаунт заблоковано." },
        buttons: [],
      };
    }

    ctx.user.active_scenario = "blocked";
    ctx.userDirty = true;
    log("SEC:blocked", "showing blocked scenario", { user_id: ctx.user.user_id });

    // Рендеримо напряму — postMiddleware не запуститься (немає next())
    await sendOrEditLiveMessage(ctx);

    // Зберігаємо стан (active_scenario = "blocked")
    if (ctx.userDirty && ctx.from) {
      const updates: Record<string, any> = {};
      for (const [key, value] of Object.entries(ctx.user)) {
        if (key !== "user_id") {
          updates[key] = typeof value === "object" && value !== null ? JSON.stringify(value) : value;
        }
      }
      const userRepo = new UserRepository(ctx.env);
      await userRepo.updateUser(ctx.from.id, updates);
      log("SEC:blocked", "saved blocked state to DB", { user_id: ctx.user.user_id });
    }
  }
  return;
});

// ── 5. SEC-1: Rate limiting ──
preMiddleware.use(async (ctx, next) => {
  if (!checkRateLimit(ctx)) {
    return; // Тихо ігноруємо — перевищено ліміт
  }
  await next();
});
