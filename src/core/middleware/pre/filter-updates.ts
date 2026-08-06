import { MiddlewareFn } from "grammy";
import { log } from "../../../shared/utils/debug";

export const filterUpdates: MiddlewareFn = async (ctx, next) => {
  if ("edited_message" in ctx.update || "edited_channel_post" in ctx.update) {
    log("PRE:filter", "skipped | reason: edited_message");
    return;
  }

  if ("channel_post" in ctx.update) {
    log("PRE:filter", "skipped | reason: channel_post");
    return;
  }

  log("PRE:filter", "passed");
  await next();
};
