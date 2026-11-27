/**
 * Маршрутизація бота за єдиним ключем `lookup`.
 *
 * Пріоритет: службовий діалог допуску → команда → callback → текст.
 * Ключ шукається точно, без нормалізації: `/start` без payload — це `/start`,
 * `/start dateanalysis` — `dateanalysis` (payload і є ключем), callback — його
 * `data` як є.
 *
 * @module bot-dev/src/core/router/bot-router
 */

import type { AppContext } from "../../shared/types/env";
import { ScenarioRepository } from "../../repositories/scenario.repository";
import { APP_LOOKUP, isAppView, type AppView } from "../../shared/config/app-views";
import { renderScenario } from "../../shared/utils/scenario-screen";
import { deleteIncomingMessage } from "../../shared/utils/message";
import { log } from "../../shared/utils/debug";
import { hasAccess } from "@wwwuabot/shared/security/access";
import { applyContactPayload } from "../../modules/contacts/contact-link";
import { showInviteScreen } from "../../modules/contacts/invite-screen";
import { showAccessDenied } from "../../modules/access/denied";
import { handleContactFlow } from "../../modules/access/contact/reply";
import { handleContactCallback } from "../../modules/access/contact/panel";
import { handleReportCommand } from "../../modules/reports/history";
import { splitInviteCode } from "../../modules/access/payload";
import { handleCartCallback } from "../../modules/search/cart.handler";
import { handleSearch } from "../../modules/search/search.handler";
import { handleWords } from "../../modules/search/words.handler";
import { handleStart } from "../../modules/start/start.handler";
import { pickTenant, rememberTenant, tenantForUser } from "../../shared/tenant-context";

/** `ctx.user` перевірено на вході, але `await` знімає звуження типів. */
function userIdOf(ctx: AppContext): number | null {
  return typeof ctx.user?.user_id === "number" ? ctx.user.user_id : null;
}
import { handleAdminPanel } from "../../modules/admin/admin-panel";
import { recordIncomingMessage } from "../../modules/history/record";

export async function botRouter(ctx: AppContext): Promise<void> {
  if (!ctx.user) return;

  // Переписка: вхідне — у `bot_messages`. Саме тут, а не в `pre`: роутер
  // виконується вже після блокувань і ліміту, тож у історію не потрапляє те,
  // що бот відкинув.
  await recordIncomingMessage(ctx);

  if (!hasAccess(ctx.user, ctx.env.ADMIN_TELEGRAM_ID)) {
    if (ctx.callbackQuery && (await handleContactCallback(ctx))) return;
    if (await handleContactFlow(ctx)) return;
  }

  const text = ctx.message?.text;

  // Кнопки кошика в rich-екрані — дія, а не ключ сценарію.
  if (ctx.callbackQuery?.data?.startsWith("cart:")) {
    ctx.screenHandled = true;
    await handleCartCallback(ctx);
    return;
  }

  // Звіти агента — службовий екран власника, не сценарій: кнопка «Історія» в
  // звіті веде саме сюди, а не в контент.
  if (ctx.callbackQuery?.data === "reports") {
    ctx.screenHandled = true;
    if (await handleReportCommand(ctx, "/reports")) return;
  }

  if (ctx.callbackQuery) {
    await show(ctx, ctx.callbackQuery.data ?? "");
    return;
  }

  if (text?.startsWith("/")) {
    if (text === "/reports" || text.startsWith("/report ")) {
      ctx.screenHandled = true;
      if (await handleReportCommand(ctx, text)) return;
    }

    const [command, payload = ""] = text.split(" ");
    const name = command.split("@")[0];

    // Панель — лише власнику: її сторінка відкривається тільки в Telegram.
    if (name === "/admin") {
      ctx.screenHandled = true;
      if (await handleAdminPanel(ctx)) return;
      await deleteIncomingMessage(ctx);
      return;
    }

    // Довідник слів — окремий екран, а не сценарій і не пошуковий запит.
    if (name === "/words") {
      if (await handleWords(ctx)) return;
      await deleteIncomingMessage(ctx);
      return;
    }

    if (name !== "/start") {
      await deleteIncomingMessage(ctx);
      return;
    }

    // Голий `/start` — вітання rich-екраном. Діплінк іде далі: там конкретна
    // сторінка або контакт, а не стартовий екран.
    if (!payload.trim() && (await handleStart(ctx))) return;

    // `p_<key>` — це проєкт, а не сторінка: вибір запам'ятовується, а екран
    // показуємо вже з нього. Невідомий чи чужий проєкт — відмова, а не тихий
    // відкат на головний: інакше друкарська помилка в посиланні відкривала б
    // чужий простір.
    const chatUserId = userIdOf(ctx);
    if (chatUserId === null) return;
    const picked = await pickTenant(ctx.env, chatUserId, payload.trim());
    if (picked) {
      ctx.screenHandled = true;
      if (!picked.ok) {
        if (await showAccessDenied(ctx)) await deleteIncomingMessage(ctx);
        return;
      }
      await rememberTenant(ctx.env, chatUserId, picked.tenant.id);
      // `p_<key>` — це не адреса сторінки: показуємо стартовий екран проєкту.
      await show(ctx, "/start", true);
      return;
    }

    const { inviteCode, pagePayload } = splitInviteCode(payload.trim());
    if (inviteCode) {
      const contacted = await applyContactPayload(ctx, inviteCode);
      if (contacted.kind !== "unknown") {
        if (contacted.kind !== "invited" || !(await showInviteScreen(ctx, contacted.ownerId))) {
          await show(ctx, pagePayload || "/start", true);
        }
        return;
      }
    }
    await show(ctx, pagePayload || "/start", true);
    return;
  }

  if (text) {
    if (!hasAccess(ctx.user, ctx.env.ADMIN_TELEGRAM_ID)) {
      await deleteIncomingMessage(ctx);
      return;
    }
    // Будь-який текст у приватній лістці — пошуковий запит. Команди й
    // діплінки сюди не доходять: їх розібрано вище.
    if (await handleSearch(ctx, text)) return;
    await show(ctx, text);
    return;
  }

  log("ROUTER", "ignored | no actionable content");
}

/** Показати сценарій за ключем; відмова — теж відповідь, а не помилка. */
async function show(ctx: AppContext, lookup: string, dropIncoming = false): Promise<void> {
  if (!hasAccess(ctx.user, ctx.env.ADMIN_TELEGRAM_ID)) {
    if (await showAccessDenied(ctx)) await deleteIncomingMessage(ctx);
    return;
  }

  if (!lookup) {
    await deleteIncomingMessage(ctx);
    return;
  }

  const repo = new ScenarioRepository(ctx.env);
  const userId = userIdOf(ctx);
  if (userId === null) return;
  const tenant = await tenantForUser(ctx.env, userId);
  // `about` і `contacts` — це види головного віджета, а не окремі сценарії:
  // документ один, тож і шукаємо його, а вид віддаємо стартовим станом.
  const view: AppView | undefined = isAppView(lookup) ? lookup : undefined;
  const scenario = await repo.findByLookup(view ? APP_LOOKUP : lookup, tenant.id);
  if (!scenario) {
    log("ROUTER", "scenario not found", { lookup });
    await deleteIncomingMessage(ctx);
    return;
  }

  // Спроба показати екран — уже відповідь: невдача не робить вхід «зайвим»,
  // інакше повідомлення людини зникає без жодного екрана на заміну.
  ctx.screenHandled = true;
  const shown = await renderScenario(ctx, scenario, view);
  if (shown && (dropIncoming || ctx.callbackQuery)) {
    // Повідомлення людини зносить сам рендер; для `callback_query` вхідного
    // повідомлення немає.
    ctx.dropIncomingAfterRender = false;
  }
}
