/**
 * Екран збігів: акордеон на результат, назва в заголовку, фото, опис, ціна й
 * дії. Кількість — із серверного кошика, а не з `callback_data` (той вміщає 64
 * байти). «Мінус» на одиниці прибирає позицію, як і кошик на платформі.
 *
 * @module bot-dev/src/modules/search/search-screen
 */

import type { SearchEntry, SearchMatch } from "@wwwuabot/shared/search";

export interface SearchScreenOptions {
  /** Номер товару → кількість у кошику. */
  cart?: ReadonlyMap<number, number>;
  /** Акордеон, який лишається відкритим після тапу. */
  openProductId?: number | null;
}

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

function cartButton(label: string, data: string): string {
  return `<tg-button type="callback_data" data="${esc(data)}">${esc(label)}</tg-button>`;
}

function absolute(platformUrl: string | undefined, href: string): string | null {
  if (!platformUrl) return null;
  return `${platformUrl.replace(/\/+$/, "")}${href}`;
}

/** Дії товару: кошик у чаті, а замовлення — web_app на checkout. */
function productActions(entry: SearchEntry, url: string, qty: number, webApp: boolean): string {
  if (entry.kind !== "product" || !entry.id || !webApp) return "";

  if (qty < 1) {
    return `<tg-button-row>${cartButton("Додати в кошик", `cart:add:${entry.id}`)}</tg-button-row>`;
  }

  return (
    `<tg-button-row>` +
    cartButton("−", `cart:dec:${entry.id}`) +
    `<tg-button type="disabled">${qty} шт</tg-button>` +
    cartButton("+", `cart:inc:${entry.id}`) +
    `</tg-button-row>` +
    `<tg-button-row>${button("Замовити відразу", `${url}?order=1&qty=${qty}`, true)}</tg-button-row>`
  );
}

/** Один збіг у своєму акордеоні: тіло ховається під назвою. */
function accordion(
  entry: SearchEntry,
  platformUrl: string | undefined,
  webApp: boolean,
  open: boolean,
  cart: ReadonlyMap<number, number>,
): string {
  const parts: string[] = [`<details${open ? " open" : ""}><summary>${esc(entry.title)}</summary>`];
  if (entry.photo) parts.push(`<img src="${esc(entry.photo)}"/>`);
  if (entry.description) parts.push(`<p>${esc(entry.description)}</p>`);
  if (entry.price) parts.push(`<p>${esc(entry.price)}</p>`);

  const url = absolute(platformUrl, entry.href);
  if (url) parts.push(`<tg-button-row>${button("Відкрити", url, webApp)}</tg-button-row>`);
  if (url) parts.push(productActions(entry, url, entry.id ? (cart.get(entry.id) ?? 0) : 0, webApp));
  parts.push("</details>");
  return parts.join("");
}

/** HTML відповіді; `matches` уже відібрані й відсортовані матчером. */
export function searchScreenHtml(
  query: string,
  matches: SearchMatch[],
  platformUrl: string | undefined,
  webApp: boolean,
  options: SearchScreenOptions = {},
): string {
  if (matches.length === 0) {
    return (
      `<h2>Нічого не знайдено</h2>` +
      `<p>На платформі немає нічого за запитом «${esc(query)}».</p>` +
      `<p>Спробуйте написати по-іншому.</p>`
    );
  }

  const cart = options.cart ?? new Map<number, number>();
  const opened = options.openProductId ?? null;

  return matches
    .map((match, index) => {
      const open =
        opened !== null ? match.entry.kind === "product" && match.entry.id === opened : index === 0;
      return accordion(match.entry, platformUrl, webApp, open, cart);
    })
    .join("");
}
