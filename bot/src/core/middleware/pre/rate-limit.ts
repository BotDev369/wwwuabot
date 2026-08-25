import { MiddlewareFn } from "grammy";
import { log } from "../../../shared/utils/debug";

export const rateLimit: MiddlewareFn = async (ctx, next) => {
  // TODO: Реалізувати rate limiting з використанням Cloudflare KV або D1
  log("PRE:ratelimit", "passed (not implemented yet)");
  await next();
};
