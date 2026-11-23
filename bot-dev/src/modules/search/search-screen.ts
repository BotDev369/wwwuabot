/**
 * Екран збігів — акордеон на кожен результат: назва в заголовку, під нею фото,
 * опис, ціна й «Відкрити» на всю ширину. Шапки «Знайдено…» немає: у чаті вона
 * лише дублює назви. Перший акордеон відкритий, решта — згорнуті.
 *
 * @module bot-dev/src/modules/search/search-screen
 */

import type { SearchEntry, SearchMatch } from "@wwwuabot/shared/search";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function button(label: string, url: string, webApp: boolean): string {
  const type = webApp ? "web_app" : "url";
  return `<tg-button type="${type}" url="${esc(url)}">${esc(label)}</tg-button>`;
}

function absolute(platformUrl: string | undefined, href: string): string | null {
  if (!platformUrl) return null;
  return `${platformUrl.replace(/\/+$/, "")}${href}`;
}

/** Один збіг у своєму акордеоні: тіло ховається під назвою. */
function accordion(
  entry: SearchEntry,
  platformUrl: string | undefined,
  webApp: boolean,
  open: boolean,
): string {
  const parts: string[] = [`<details${open ? " open" : ""}><summary>${esc(entry.title)}</summary>`];
  if (entry.photo) parts.push(`<img src="${esc(entry.photo)}"/>`);
  if (entry.description) parts.push(`<p>${esc(entry.description)}</p>`);
  if (entry.price) parts.push(`<p>${esc(entry.price)}</p>`);

  const url = absolute(platformUrl, entry.href);
  if (url) parts.push(`<tg-button-row>${button("Відкрити", url, webApp)}</tg-button-row>`);
  parts.push("</details>");
  return parts.join("");
}

/** HTML відповіді; `matches` уже відібрані й відсортовані матчером. */
export function searchScreenHtml(
  query: string,
  matches: SearchMatch[],
  platformUrl: string | undefined,
  webApp: boolean,
): string {
  if (matches.length === 0) {
    return (
      `<h2>Нічого не знайдено</h2>` +
      `<p>На платформі немає нічого за запитом «${esc(query)}».</p>` +
      `<p>Спробуйте написати по-іншому.</p>`
    );
  }

  return matches
    .map((match, index) => accordion(match.entry, platformUrl, webApp, index === 0))
    .join("");
}
