import { FAVORITES_PATH, PROFILE_PATH, SPACE_PATH } from "@wwwuabot/shared/app/routes";
import type { AppContext } from "../types/env";
import type { ScenarioButton } from "../types/scenario";
import { PLATFORM_ROW } from "../config/texts";
import { getPhoto } from "./photo";
import { log } from "./debug";
import type { InputRichMessage, InlineKeyboardButton } from "grammy/types";

/**
 * Три екрани платформи в тому самому порядку, що й пункти футера: спершу себе,
 * потім збережене, потім інших людей.
 */
const PLATFORM_TARGETS: readonly { icon: string; path: string }[] = [
  { icon: PLATFORM_ROW.profile, path: PROFILE_PATH },
  { icon: PLATFORM_ROW.favorites, path: FAVORITES_PATH },
  { icon: PLATFORM_ROW.space, path: SPACE_PATH },
];

export interface CaptionBlocks {
  top?: string;
  mid?: string;
  bot?: string;
}

export function buildCaption(blocks: CaptionBlocks): string {
  const parts = [blocks.top, blocks.mid, blocks.bot].filter((b) => b && b.trim() !== "");
  return parts.join("\n───────\n");
}

/** Будує абсолютну адресу Mini App для поточного маршруту. */
export function buildWebAppUrl(
  baseUrl: string | undefined,
  webPath: string | undefined,
): string | null {
  if (!baseUrl || !webPath) return null;
  try {
    return new URL(webPath, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
  } catch {
    return null;
  }
}

/**
 * Рядок емодзі з трьох екранів платформи — або `null`, якщо немає чим наповнити
 * кнопки (`WEB_PLATFORM_URL` не заданий: Telegram не приймає `web_app` без url).
 *
 * Адреси взяті зі спільного `@wwwuabot/shared/app/routes`: платформа читає ті
 * ж літерали у своєму `app/routes.ts`, і другий список розійшовся б тихо.
 */
export function buildPlatformRow(platformUrl: string | undefined): ScenarioButton[] | null {
  const row = PLATFORM_TARGETS.map(({ icon, path }) => {
    const url = buildWebAppUrl(platformUrl, path);
    return url ? { text: icon, web_app: { url } } : null;
  });

  // Одна відсутня адреса робить усі кнопки без адреси, а такий рядок Telegram не
  // приймає: краще нічого, ніж напівробочий рядок емодзі.
  if (row.some((button) => button === null)) return null;

  return row as ScenarioButton[];
}

/**
 * Кнопки екрана: на першому екрані (`landing`) — **лише** рядок екранів
 * платформи, на всіх інших — збережені кнопки сценарію плюс системна кнопка
 * відкриття вебсторінки.
 *
 * **Чому перший екран без кнопок сторінки.** Він відкривається самому собою
 * (`/start` без діплінка), і кнопки сторінки — це вхід у сценарії, яких ще
 * немає в розмові. Замість них під картинкою стоїть те, що людині потрібне
 * відразу: три екрани платформи, як у футері.
 */
export function buildScreenButtons(
  screen: { buttons: readonly (readonly ScenarioButton[])[]; web_path?: string; landing?: boolean },
  platformUrl?: string,
): ScenarioButton[][] {
  if (screen.landing) {
    const row = buildPlatformRow(platformUrl);
    return row ? [row] : [];
  }

  const buttons = screen.buttons.map((row) => row.map((button) => ({ ...button })));
  const webAppUrl = buildWebAppUrl(platformUrl, screen.web_path);
  if (!webAppUrl) return buttons;

  const alreadyPresent = buttons.some((row) =>
    row.some((button) => button.web_app?.url === webAppUrl),
  );
  if (!alreadyPresent) {
    buttons.push([{ text: "Відкрити сторінку", web_app: { url: webAppUrl } }]);
  }
  return buttons;
}

/**
 * Відправляє нове повідомлення та видаляє старі (вхідне + попереднє від бота).
 * НІКОЛИ не редагує — тільки send + delete.
 */
export async function sendOrEditLiveMessage(ctx: AppContext): Promise<boolean> {
  if (!ctx.screen) return false;
  const { slug, photo_url, caption } = ctx.screen;
  const chatId = ctx.chat!.id;
  const buttons = buildScreenButtons(ctx.screen, ctx.env.WEB_PLATFORM_URL);

  log("SCREEN", "rendering", { slug, chat_id: chatId });

  const photoUrl = await getPhoto(slug, photo_url, ctx.env);
  const captionText = buildCaption(caption);

  // ── RICH MESSAGE ──────────────────────────────────────────────
  if (
    ctx.screen.rich_message === true &&
    ctx.screen.rich_data &&
    Array.isArray(ctx.screen.rich_data)
  ) {
    log("SCREEN:rich", "rendering rich message", { slug, chat_id: chatId });
    const richMessage: InputRichMessage = {
      blocks: ctx.screen.rich_data as unknown as InputRichMessage["blocks"],
    };

    try {
      const sent = await ctx.api.sendRichMessage(chatId, richMessage, {
        reply_markup: { inline_keyboard: buttons as unknown as InlineKeyboardButton[][] },
      });
      log("SCREEN:rich", "send success", { new_message_id: sent.message_id });

      await deleteOldMessages(ctx, chatId, sent.message_id);

      ctx.user!.message_id = sent.message_id;
      ctx.userDirty = true;
      ctx.liveMessageSent = true;
      return true;
    } catch (err) {
      log("SCREEN:rich", "send failed", { error: String(err) });
      return false;
    }
  }

  if (ctx.screen.rich_message === true) {
    log("SCREEN:rich", "rich_message is true but rich_data is invalid or empty, skipping");
    return false;
  }

  // ── ЗВИЧАЙНЕ ПОВІДОМЛЕННЯ (photo) ──────────────────────────────
  try {
    const sent = await ctx.api.sendPhoto(chatId, photoUrl, {
      caption: captionText,
      reply_markup: { inline_keyboard: buttons as unknown as InlineKeyboardButton[][] },
      parse_mode: "HTML",
    });
    log("SCREEN", "send success", { new_message_id: sent.message_id });

    await deleteOldMessages(ctx, chatId, sent.message_id);

    ctx.user!.message_id = sent.message_id;
    ctx.userDirty = true;
    ctx.liveMessageSent = true;
    return true;
  } catch (err) {
    log("SCREEN", "send failed", { error: String(err) });
    return false;
  }
}

/** Видаляє старі повідомлення: вхідне від юзера + попереднє від бота. */
async function deleteOldMessages(
  ctx: AppContext,
  chatId: number,
  newMessageId: number,
): Promise<void> {
  const idsToDelete: number[] = [];

  const oldBotMessageId = ctx.user?.message_id;
  if (typeof oldBotMessageId === "number" && oldBotMessageId !== newMessageId) {
    idsToDelete.push(oldBotMessageId);
  }

  if (ctx.message?.message_id) {
    idsToDelete.push(ctx.message.message_id);
  }

  if (idsToDelete.length === 0) return;

  try {
    await (
      ctx.api as unknown as {
        raw: {
          deleteMessages: (params: { chat_id: number; message_ids: number[] }) => Promise<unknown>;
        };
      }
    ).raw.deleteMessages({
      chat_id: chatId,
      message_ids: idsToDelete,
    });
    log("SCREEN", "deleted old messages", { ids: idsToDelete });
  } catch (err) {
    log("SCREEN", "failed to delete old messages (non-critical)", {
      error: String(err),
      ids: idsToDelete,
    });
  }
}
