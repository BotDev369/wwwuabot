/**
 * Стартовий екран: вітання по імені й два згорнуті акордеони.
 *
 * Тексти всередині — «в розробці»: їх пише власник, а не код. Екран не
 * редагує попередній — бот відправляє нове повідомлення (`docs/SEARCH.md`).
 *
 * @module bot-dev/src/modules/start/screen
 */

import { BRAND } from "../../shared/config/texts";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** HTML старту; `name` — ім'я з Telegram, може бути порожнім. */
export function startScreenHtml(name: string): string {
  const who = name.trim();
  const greeting = who ? `Вітаємо, ${esc(who)}!` : "Вітаємо!";

  return (
    `<h1>${esc(BRAND.name)}</h1>` +
    `<p>${greeting}</p>` +
    `<p>Напишіть що Вас цікавить</p>` +
    `<details><summary>ПРО ПЛАТФОРМУ</summary><p>в розробці</p></details>` +
    `<details><summary>КОНТАКТИ</summary><p>в розробці</p></details>`
  );
}
