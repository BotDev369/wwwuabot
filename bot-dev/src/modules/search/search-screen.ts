/**
 * Екран пошуку — одне rich-повідомлення: фото, заголовки, роздільники й кнопки.
 * `<tg-button-row>` без `align` розтягує «Відкрити» на всю ширину; фото — з R2.
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

function card(entry: SearchEntry, platformUrl: string | undefined, webApp: boolean): string {
  const parts: string[] = [];
  if (entry.photo) parts.push(`<img src="${esc(entry.photo)}"/>`);
  parts.push(`<h3>${esc(entry.title)}</h3>`);

  const subtitle = [entry.subtitle, entry.price].filter(Boolean).join(" · ");
  if (subtitle) parts.push(`<p>${esc(subtitle)}</p>`);

  const url = absolute(platformUrl, entry.href);
  if (url) {
    parts.push(`<tg-button-row>${button("Відкрити", url, webApp)}</tg-button-row>`);
    if (entry.kind === "product") {
      parts.push(
        `<tg-button-row>${button("У кошик", `${url}?add=1`, webApp)}` +
          `${button("Замовити", `${url}?order=1`, webApp)}</tg-button-row>`,
      );
    }
  }
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

  const head =
    `<h2>Знайдено на платформі</h2>` + `<p>За запитом «${esc(query)}» — ${matches.length}.</p>`;
  return head + matches.map((match) => card(match.entry, platformUrl, webApp)).join("<hr/>");
}
