import { Composer } from "grammy";
import type { AppContext } from "../../../shared/types/env";
import { filterUpdates } from "./filter-updates";
import { rateLimit } from "./rate-limit";
import { UserRepository } from "../../../modules/users/user.repository";
import { log } from "../../../shared/utils/debug";

export const preMiddleware = new Composer<AppContext>();

// ← ДОДАТИ ЦЕЙ БЛОК: Миттєва відповідь на callback_query
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
// --------------------------------------------

preMiddleware.use(filterUpdates);
preMiddleware.use(rateLimit);

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
