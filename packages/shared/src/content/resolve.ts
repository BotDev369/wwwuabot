/**
 * Адреса сторінки: одна сутність `slug` і два її подання.
 *
 * Веб використовує `/` між сегментами, Telegram payload — `_`. У сховищі
 * зберігається тільки канонічний `slug`; параметри після slug не є рядками БД.
 *
 * @module @wwwuabot/shared/content/resolve
 */

import type { ContentPage } from "./types";

/** Порожній slug — головна сторінка. */
export const HOME_SLUG = "";
/** Розділювач сегментів у веб-адресі. */
export const WEB_SEPARATOR = "/";
/** Розділювач сегментів у Telegram `?start=`. */
export const BOT_SEPARATOR = "_";
/** Telegram обрізає payload, довший за 64 символи. */
export const MAX_BOT_PAYLOAD = 64;

const SEGMENT_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Канонізує зовнішнє подання slug, не переписуючи дані в сховищі. */
export function normalizeSlug(ref?: string | null): string {
  const withoutQuery = (ref ?? "").trim().split(/[?#]/)[0] ?? "";
  return withoutQuery.replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/");
}

/** Розкладає slug на сегменти; головна сторінка має порожній список. */
export function slugSegments(ref?: string | null): string[] {
  const slug = normalizeSlug(ref);
  return slug === HOME_SLUG ? [] : slug.split(WEB_SEPARATOR);
}

/** Чи можна slug без втрат подати і у вебі, і в Telegram payload. */
export function isValidSlug(ref: string): boolean {
  return slugSegments(ref).every((segment) => SEGMENT_RE.test(segment));
}

/** Будує веб-шлях із slug і його параметрів. */
export function toWebPath(ref: string, params: readonly string[] = []): string {
  const segments = [...slugSegments(ref), ...params.map((param) => normalizeSlug(param))];
  return segments.length === 0 ? WEB_SEPARATOR : WEB_SEPARATOR + segments.join(WEB_SEPARATOR);
}

/** Будує Telegram payload із тих самих сегментів. */
export function toBotPayload(ref: string, params: readonly string[] = []): string {
  return [...slugSegments(ref), ...params.map((param) => normalizeSlug(param))].join(BOT_SEPARATOR);
}

/** Чи не буде Telegram мовчки обрізати згенерований payload. */
export function isDeepLinkable(ref: string, params: readonly string[] = []): boolean {
  return toBotPayload(ref, params).length <= MAX_BOT_PAYLOAD;
}

/** Розбирає Telegram payload на сегменти. */
export function botPayloadSegments(payload?: string | null): string[] {
  const value = (payload ?? "").trim();
  return value === "" ? [] : value.split(BOT_SEPARATOR);
}

/** Перевіряє Telegram payload до звернення до сховища. */
export function isValidBotPayload(payload?: string | null): boolean {
  const value = (payload ?? "").trim();
  return (
    value.length <= MAX_BOT_PAYLOAD && isValidSlug(botPayloadSegments(value).join(WEB_SEPARATOR))
  );
}

/** Відповідна сторінка та дані після її slug. */
export interface ContentRoute {
  page: ContentPage;
  params: string[];
}

function matchRoute(
  pages: readonly ContentPage[],
  segments: readonly string[],
): ContentRoute | null {
  if (segments.length === 0) {
    const home = pages.find((page) => normalizeSlug(page.slug) === HOME_SLUG);
    return home ? { page: home, params: [] } : null;
  }

  let best: ContentPage | null = null;
  let bestLength = -1;
  for (const page of pages) {
    const candidate = slugSegments(page.slug);
    if (candidate.length === 0 || candidate.length > segments.length) continue;
    if (!candidate.every((part, index) => part === segments[index])) continue;
    if (candidate.length > bestLength) {
      best = page;
      bestLength = candidate.length;
    }
  }
  return best ? { page: best, params: segments.slice(bestLength) } : null;
}

/** Визначає сторінку за веб-шляхом без fallback. */
export function resolveContentRoute(
  pages: readonly ContentPage[],
  ref?: string | null,
): ContentRoute | null {
  return matchRoute(pages, slugSegments(ref));
}

/** Визначає сторінку за Telegram payload без fallback. */
export function resolveBotPayload(
  pages: readonly ContentPage[],
  payload?: string | null,
): ContentRoute | null {
  return matchRoute(pages, botPayloadSegments(payload));
}

/** Визначає сторінку з fallback на головну, якщо вона є. */
export function pickContentPage(
  pages: readonly ContentPage[],
  ref?: string | null,
): ContentPage | null {
  return (
    resolveContentRoute(pages, ref)?.page ??
    pages.find((page) => normalizeSlug(page.slug) === HOME_SLUG) ??
    null
  );
}
