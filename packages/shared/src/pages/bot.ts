/**
 * Подання сторінки з шаблону **в боті**: те, що видно в повідомленні до дотику.
 *
 * **Сторінка людини не має власного повідомлення.** Рядок має `caption_*` і
 * `buttons`, але шаблон їх не заповнює: людина змінює текст сторінки, а не
 * повідомлення бота. Тож бот **виводить** підпис із того самого `page_data`,
 * який рендерить веб: другого місця, куди їде текст, немає.
 *
 * **Беремо лише коротке.** У підписі стоять назва й **рядкові** поля шаблону
 * (ім'я, коли, де); абзац («Про себе») — це сама сторінка, і переказувати його
 * в повідомленні означало б показувати обрізаний текст замість повного
 * (людині для цього й дана кнопка).
 *
 * **Це звичайний текст, а не розмітка.** Telegram рендерить підпис із
 * `parse_mode: HTML`, тож будь-який `<` у тексті людини зламав би розмітку —
 * екранує той, хто цей текст відправляє (`bot-dev`), а не ця функція: тут
 * немає ні розмітки, ні знання про Telegram (`AGENTS.md` §3).
 *
 * @module @wwwuabot/shared/pages
 */

import { pageTitle, primaryField, type PageFieldValues, type PageTemplate } from "./templates";

/**
 * Підпис бота для сторінки; порожній рядок — у сторінці немає чого показувати
 * (такого не буває: назва обов'язкова — але читач не мусить це знати).
 */
export function pageBotText(template: PageTemplate, values: PageFieldValues): string {
  const primary = primaryField(template);
  const details = template.fields
    .filter((field) => field.key !== primary.key && field.kind === "line")
    .map((field) => (values[field.key] ?? "").trim())
    .filter(Boolean);

  return [pageTitle(template, values), details.join("\n")].filter(Boolean).join("\n\n");
}
