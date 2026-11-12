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
import { renderScenario } from "../../shared/utils/scenario-screen";
import { deleteIncomingMessage } from "../../shared/utils/message";
import { log } from "../../shared/utils/debug";
import { hasAccess } from "@wwwuabot/shared/security/access";
import { applyContactPayload } from "../../modules/contacts/contact-link";
import { showInviteScreen } from "../../modules/contacts/invite-screen";
import { showAccessDenied } from "../../modules/access/denied";
import { handleContactFlow } from "../../modules/access/contact/reply";
import { handleContactCallback } from "../../modules/access/contact/panel";
import { splitInviteCode } from "../../modules/access/payload";

export async function botRouter(ctx: AppContext): Promise<void> {
  if (!ctx.user) return;

  if (!hasAccess(ctx.user, ctx.env.ADMIN_TELEGRAM_ID)) {
    if (ctx.callbackQuery && (await handleContactCallback(ctx))) return;
    if (await handleContactFlow(ctx)) return;
  }

  const text = ctx.message?.text;
  if (ctx.callbackQuery) {
    await show(ctx, ctx.callbackQuery.data ?? "");
    return;
  }

  if (text?.startsWith("/")) {
    const [command, payload = ""] = text.split(" ");
    if (command.split("@")[0] !== "/start") {
      await deleteIncomingMessage(ctx);
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

  const scenario = await new ScenarioRepository(ctx.env).findByLookup(lookup);
  if (!scenario) {
    log("ROUTER", "scenario not found", { lookup });
    await deleteIncomingMessage(ctx);
    return;
  }

  const shown = await renderScenario(ctx, scenario);
  if (shown && (dropIncoming || ctx.callbackQuery)) {
    // Повідомлення людини зносить сам рендер; для `callback_query` вхідного
    // повідомлення немає.
    ctx.dropIncomingAfterRender = false;
  }
}
