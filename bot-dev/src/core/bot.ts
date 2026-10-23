import * as Sentry from "@sentry/cloudflare";
import { Bot, BotError } from "grammy";
import type { Env, AppContext } from "../shared/types/env";
import { TEXTS } from "../shared/config/texts";
import { preMiddleware } from "./middleware/pre";
import { interceptMiddleware } from "./middleware/intercept";
import { postMiddleware } from "./middleware/post";

export function createBot(env: Env): Bot<AppContext> {
  const bot = new Bot<AppContext>(env.BOT_TOKEN);

  // Додаємо env до контексту
  bot.use(async (ctx, next) => {
    ctx.env = env;
    await next();
  });

  // Підключення middleware (botRouter тепер всередині postMiddleware)
  bot.use(preMiddleware);
  bot.use(interceptMiddleware);
  bot.use(postMiddleware);

  // Глобальний обробник помилок
  bot.catch(async (err: BotError<AppContext>) => {
    const ctx = err.ctx;
    const error = err.error;
    // Помилки, які grammY ловить сам, не долітають до `withSentry` — звітуємо
    // явно. Контекст Telegram (текст повідомлення, initData) НЕ передаємо:
    // у Sentry має їхати тільки сам виняток.
    Sentry.captureException(error);
    // Подію зі `status=error` уже записав `interceptMiddleware`: він обгортає
    // решту ланцюга, і другий запис дав би дві події на одну помилку.
    const errorMsg = TEXTS.error(env.ENVIRONMENT);
    await ctx.reply(errorMsg).catch((replyErr) => {
      console.error(
        JSON.stringify({
          level: "error",
          context: "reply_fallback_critical",
          message: replyErr instanceof Error ? replyErr.message : String(replyErr),
        }),
      );
    });
  });

  return bot;
}
