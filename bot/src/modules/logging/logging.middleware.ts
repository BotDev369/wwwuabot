import { MiddlewareFn } from "grammy";
import { AppContext } from "../../shared/types/env";
import { LogQueueService } from "./queue";
import { buildLogMessage } from "./builder";

export const comprehensiveLogger: MiddlewareFn<AppContext> = async (ctx, next) => {
  const startTime = Date.now();
  const env = ctx.env;
  
  try {
    await next();
    
    // Успіх: формуємо лог через log-builder
    const log = buildLogMessage(ctx, 'success');
    log.duration_ms = Date.now() - startTime;
    
    await LogQueueService.push(env, log);
  } catch (error) {
    // Помилка: формуємо лог з помилкою
    const log = buildLogMessage(ctx, 'error', error);
    log.duration_ms = Date.now() - startTime;
    
    await LogQueueService.push(env, log);
    
    // Перекидаємо помилку далі для глобального обробника
    throw error;
  }
};