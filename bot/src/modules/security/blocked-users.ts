import type { AppContext } from "../../shared/types/env";
import { log } from "../../shared/utils/debug";

/**
 * Перевіряє чи заблокований користувач.
 * Колонка `is_blocked` додається автоматично через withAutoMigrate.
 *
 * @returns `true` якщо користувач заблокований (слід ігнорувати апдейт)
 */
export function isUserBlocked(ctx: AppContext): boolean {
  if (!ctx.user) return false;

  const blocked = (ctx.user as any).is_blocked;
  if (blocked === 1 || blocked === true) {
    log("SEC:blocked", "BLOCKED user, ignoring update", {
      user_id: ctx.user.user_id,
    });
    return true;
  }

  return false;
}

/**
 * Встановлює прапорець блокування для користувача.
 */
export function blockUser(ctx: AppContext): void {
  if (!ctx.user) return;
  (ctx.user as any).is_blocked = 1;
  ctx.userDirty = true;
  log("SEC:blocked", "user blocked", { user_id: ctx.user.user_id });
}

/**
 * Знімає прапорець блокування для користувача.
 */
export function unblockUser(ctx: AppContext): void {
  if (!ctx.user) return;
  (ctx.user as any).is_blocked = 0;
  ctx.userDirty = true;
  log("SEC:blocked", "user unblocked", { user_id: ctx.user.user_id });
}
