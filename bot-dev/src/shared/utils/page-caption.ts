/**
 * Підпис бота для сторінки з шаблону — **виведений**, а не збережений.
 *
 * У людини сторінка має власне повідомлення тільки в тому сенсі, що вона має
 * текст: `caption_*` шаблон не заповнює, тож без цього бот показував би порожнє
 * повідомлення з самою кнопкою. Беремо той самий `page_data`, який рендерить
 * веб (`pageBotText` із `@wwwuabot/shared/pages`) — **другого місця, куди їде
 * текст, немає**.
 *
 * **Екрануємо, бо текст написала людина.** Підпис відправляється з
 * `parse_mode: HTML`, а `<` у ньому зламав би розмітку цілком. Правило
 * `escapeHtml` («тільки для тексту користувача, не для контенту БД») тут саме
 * на місці: це не адмінський сценарій, а поле, яке заповнила людина.
 *
 * **Готового підпису не чіпаємо.** Якщо сторінку відредагували як звичайний
 * сценарій (вкладка «Бот» в адмінці), слово автора важливіше за наше: там уже
 * написано, що показувати.
 *
 * @module bot-dev/src/shared/utils/page-caption
 */

import { parsePageConfig } from "@wwwuabot/shared/types/page-config";
import {
  isPageTemplateKey,
  pageBotText,
  pageTemplate,
  readPageValues,
} from "@wwwuabot/shared/pages";
import { escapeHtml } from "../../modules/security/input-validation";

/** Те, що потрібно від рядка `scenarios`; ширший тип тут не потрібен. */
export interface PageCaptionSource {
  template_key: string | null;
  page_data: string | null;
  /** Збережені підписи рядка — `caption_top`, `caption_mid`, `caption_bot`. */
  captions: readonly (string | null)[];
}

/** Виведений підпис або `null`, якщо показувати більше нічого. */
export function pageBotCaption(source: PageCaptionSource): string | null {
  const saved = source.captions.some((caption) => caption && caption.trim() !== "");
  if (saved || !isPageTemplateKey(source.template_key)) return null;

  const template = pageTemplate(source.template_key);
  const values = readPageValues(template, parsePageConfig(source.page_data));
  const text = pageBotText(template, values);

  return text ? escapeHtml(text) : null;
}
