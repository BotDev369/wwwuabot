/**
 * Що показати в бульбашці переписки: звичайний текст як є, rich — без
 * розмітки й обрізаний, бо повний екран у бульбашці не читають.
 *
 * @module web-admin-dev/src/pages/users/bot-message-text
 */

import type { BotMessageRow } from "../../shared/api/users.api";

/** Скільки символів rich-екрана лишаємо в бульбашці. */
const RICH_PREVIEW_MAX = 600;

/** Підпис для повідомлення без тексту — вид, а не порожнеча. */
const KIND_LABELS: Record<string, string> = {
  photo: "[фото]",
  sticker: "[стікер]",
  command: "[команда]",
  other: "[вкладення]",
};

/** Текст бульбашки: rich — без розмітки, решта — як є. */
export function botMessageText(message: BotMessageRow): string {
  const text = message.text.trim();
  if (message.kind === "rich") return richPreview(text);
  if (text) return text;
  return KIND_LABELS[message.kind] ?? "[без тексту]";
}

function richPreview(html: string): string {
  const plain = html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|details|summary|tr|tg-button-row)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return plain.length > RICH_PREVIEW_MAX ? `${plain.slice(0, RICH_PREVIEW_MAX).trimEnd()}…` : plain;
}
