import { Bot, BotError } from "grammy";
import type { Env, AppContext } from "../shared/types/env";
import { TEXTS } from "../shared/config/texts";
import { LogQueueService } from "../modules/logging/queue";
import { buildLogMessage } from "../modules/logging/builder";
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
    const log = buildLogMessage(ctx, "error", error);
    log.action_type = `bot_${ctx.update?.message ? "message" : "callback_query"}`;
    await LogQueueService.push(env, log);
    const errorMsg = TEXTS.error(env.ENVIRONMENT);
    await ctx.reply(errorMsg).catch((replyErr) => {
      console.error(JSON.stringify({
        level: "error",
        context: "reply_fallback_critical",
        message: replyErr instanceof Error ? replyErr.message : String(replyErr),
      }));
    });
  });

  return bot;
}