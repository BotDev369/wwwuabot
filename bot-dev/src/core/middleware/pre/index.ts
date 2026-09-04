import { Composer } from "grammy";
import type { AppContext } from "../../../shared/types/env";
import { filterUpdates } from "./filter-updates";
import { UserRepository } from "../../../modules/users/user.repository";
import { isUserBlocked } from "../../../modules/security/blocked-users";
import { checkRateLimit } from "../../../modules/security/rate-limiter";
import { log } from "../../../shared/utils/debug";

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

// ── 4. SEC-2: Блокування — видаляємо повідомлення, тихо ігноруємо (нотифікація від web-admin) ──
preMiddleware.use(async (ctx, next) => {
  if (!isUserBlocked(ctx)) {
    await next();
    return;
  }

  // Видаляємо повідомлення користувача
  if (ctx.message?.message_id && ctx.chat) {
    try {
      await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);
    } catch {
      // Повідомлення вже видалене або застаре для видалення
    }
  }
  if (ctx.callbackQuery?.message?.message_id && ctx.chat) {
    try {
      await ctx.api.deleteMessage(ctx.chat.id, ctx.callbackQuery.message.message_id);
    } catch {
      // Повідомлення вже видалене або застаре для видалення
    }
  }

  log("SEC:blocked", "blocked user, message deleted", { user_id: ctx.user?.user_id });
  return;
});

// ── 5. SEC-1: Rate limiting ──
preMiddleware.use(async (ctx, next) => {
  if (!checkRateLimit(ctx)) {
    return; // Тихо ігноруємо — перевищено ліміт
  }
  await next();
});
