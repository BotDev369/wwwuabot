/**
 * Картка сторінки для діплінка — **виведена зі сторінки**, а не зі сценарію:
 * адреса може вказувати на будь-яку сторінку платформи, а їх створюють люди.
 *
 * @module bot-dev/src/shared/utils/page-card
 */

/** Блоки rich-повідомлення: назва сторінки і її фото. */
export function pageCardBlocks(
  title: string | null | undefined,
  photoUrl: string | null | undefined,
): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [];
  const heading = (title ?? "").trim();

  // `size` у заголовка обов'язковий: без нього Telegram відхиляє блок.
  if (heading !== "") blocks.push({ type: "heading", text: heading, size: 1 });
  if (photoUrl) blocks.push({ type: "photo", photo: { type: "photo", media: photoUrl } });

  return blocks;
}
