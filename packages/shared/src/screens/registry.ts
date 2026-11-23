/**
 * Реєстр екранів платформи: **один** список адрес і назв.
 *
 * Екран — це рядок `platform_screens` у D1; `registry.json` — та сама таблиця в
 * репозиторії, з якої генерується seed-міграція (`scripts/build-screens.mjs`).
 * Назва, батько, місце в меню й іконка живуть **у даних**, а не в коді; код
 * лишає за собою рівно одне — який React-компонент рендерить ключ
 * (`web-platform-dev/src/app/screen-routes.tsx`).
 *
 * Правила й порядок — `docs/SCREEN_TEXTS.md`.
 *
 * @module @wwwuabot/shared/screens
 */

import type { IconName } from "../components/icon-names";
import journalLegacy from "./journal-legacy.json";
import registry from "./registry.json";

/** Один екран реєстру. */
export interface ScreenDef {
  /** Стабільна ідентичність: не змінюється разом із назвою чи адресою. */
  key: string;
  /** Шаблон веб-адреси з параметрами (`/trackers/:id`); `null` — група без адреси. */
  path: string | null;
  /** Батьківський екран: звідси будується хлібний шлях. */
  parent: string | null;
  /** Назва: хедер, меню, крохи й журнал читають її звідси. */
  title: string;
  icon: IconName | null;
  /** Порядок у меню; у підсторінок — порядок у своєму розділі. */
  sort: number;
  /** Чи стоїть екран у меню платформи. */
  inMenu: boolean;
  /** Група журналу, якщо вона не збігається з коренем адреси. */
  journal?: string;
}

/**
 * Рядок екрана так, як його віддає `GET /api/screens`: дані з бази (назва,
 * батько, меню) разом зі словами екрана.
 */
export interface ScreenRow {
  key: string;
  parentKey: string | null;
  title: string;
  icon: IconName | null;
  sortOrder: number;
  inMenu: boolean;
  texts: Record<string, string>;
}

/** Той самий список, що поїде в D1: адреса й назва — в одному рядку. */
export const SCREENS: readonly ScreenDef[] = (registry as unknown as ScreenDef[]).map((screen) => ({
  ...screen,
  path: screen.path ?? null,
  icon: screen.icon ?? null,
}));

const BY_KEY = new Map(SCREENS.map((screen) => [screen.key, screen]));

/** Екран за ключем; `null` — ключа немає (це помилка реєстру, не екрана). */
export function screenByKey(key: string): ScreenDef | null {
  return BY_KEY.get(key) ?? null;
}

/** Адреса екрана; `null` — екран без адреси. */
export function screenPath(key: string): string | null {
  return screenByKey(key)?.path ?? null;
}

/** Корінь ланцюжка: розділ, у якому стоїть екран. */
export function screenRoot(key: string): string {
  let current = screenByKey(key);
  let guard = 0;
  while (current?.parent && guard < 32) {
    const parent = screenByKey(current.parent);
    if (!parent) break;
    current = parent;
    guard += 1;
  }
  return current?.key ?? key;
}

/**
 * Ключ журналу для адреси: **розділ**, а не крок.
 *
 * Журнал описує місце, у яке людина зайшла («Аналіз»), а не кожен крок
 * проходження; невідомий шлях — це сторінка контенту (`page`).
 */
export function screenKeyOfPath(pathname: string): string {
  const match = matchScreen(pathname);
  if (!match) return "page";
  const root = screenByKey(screenRoot(match.screen.key));
  return root?.journal ?? root?.key ?? "page";
}

/** Збіг адреси з шаблоном: екран і значення параметрів. */
export interface ScreenMatch {
  screen: ScreenDef;
  params: Record<string, string>;
}

/**
 * Шаблон → регулярка; параметри `:name` стають іменованими групами.
 * `literal` — скільки сегментів адреси задані словом, а не `:параметром`.
 */
function patternOf(path: string): { regex: RegExp; names: string[]; literal: number } {
  const names: string[] = [];
  let literal = 0;
  const source = path
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      if (segment.startsWith(":")) {
        names.push(segment.slice(1));
        return "([^/]+)";
      }
      literal += 1;
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return { regex: new RegExp(`^/${source}/?$`), names, literal };
}

const MATCHERS = SCREENS.filter((screen) => screen.path && screen.path !== "/").map((screen) => ({
  screen,
  ...patternOf(screen.path as string),
}));

/**
 * Найточніший збіг: спершу більше слів в адресі, потім довший шаблон. Слово б'є
 * параметр — інакше `/scenarios/1/products/new` показувався б як «Товар»
 * (`/scenarios/:id/products/:productId`).
 */
export function matchScreen(pathname: string): ScreenMatch | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  let best: ScreenMatch | null = null;
  let bestLiteral = -1;
  let bestLength = -1;
  for (const matcher of MATCHERS) {
    const found = matcher.regex.exec(path);
    if (!found) continue;
    const length = (matcher.screen.path ?? "").length;
    if (matcher.literal < bestLiteral) continue;
    if (matcher.literal === bestLiteral && length <= bestLength) continue;
    const params: Record<string, string> = {};
    matcher.names.forEach((name, index) => {
      params[name] = decodeURIComponent(found[index + 1] ?? "");
    });
    best = { screen: matcher.screen, params };
    bestLiteral = matcher.literal;
    bestLength = length;
  }
  return best;
}

/** Ланцюжок екранів від розділу до поточного (включно). */
export function screenChain(key: string): ScreenDef[] {
  const chain: ScreenDef[] = [];
  let current = screenByKey(key);
  let guard = 0;
  while (current && guard < 32) {
    chain.unshift(current);
    current = current.parent ? screenByKey(current.parent) : null;
    guard += 1;
  }
  return chain;
}

/**
 * Адреса рівня ланцюжка з параметрами поточного шляху: `/trackers/12` для
 * батька `/trackers/:id`. Параметр не підставився — `null` (рівень без
 * посилання, а не мертвий шлях).
 */
export function screenHref(screen: ScreenDef, params: Record<string, string>): string | null {
  if (!screen.path) return null;
  let href = screen.path;
  for (const [name, value] of Object.entries(params)) {
    href = href.split(`:${name}`).join(encodeURIComponent(value));
  }
  return href.includes(":") ? null : href;
}

/**
 * Ключі журналу, яких немає серед екранів.
 *
 * `tracker`, `shop`, `pages`, `page` — динамічні сторінки (трекер, товар,
 * контент), у реєстрі їх немає й бути не може; `assessments` — колишня назва
 * розділу, але старі рядки журналу лишаються в базі й мусять мати підпис.
 */
const JOURNAL_LEGACY: readonly { key: string; label: string }[] = journalLegacy;

/**
 * Словник журналу: ключі розділів і їхні назви.
 *
 * Це не другий список екранів — це **подання** реєстру плюс ключі динамічних
 * сторінок: сервер приймає лише те, що оголошено тут, тож довільний текст від
 * клієнта в журнал не потрапляє.
 */
export const PLATFORM_SCREENS: readonly { key: string; label: string }[] = [
  ...SCREENS.filter((screen) => screen.parent === null && screen.key !== "entry").map((screen) => ({
    key: screen.journal ?? screen.key,
    label: screen.title,
  })),
  ...JOURNAL_LEGACY,
];

/** Чи це оголошений ключ журналу. */
export function isPlatformScreenKey(value: unknown): value is string {
  return typeof value === "string" && PLATFORM_SCREENS.some((screen) => screen.key === value);
}

/** Людська назва розділу; невідомий ключ не губиться. */
export function screenLabel(key: string): string {
  return PLATFORM_SCREENS.find((screen) => screen.key === key)?.label ?? key;
}

/**
 * Сегменти, зайняті платформою: верхівка кожної адреси реєстру.
 *
 * Список **виводиться**, а не пишеться руками: сторінка контенту з такою
 * адресою не відкрилась би ніколи, бо маршрут довший за catch-all.
 */
export const SCREEN_RESERVED_SLUGS: readonly string[] = [
  ...new Set(
    SCREENS.flatMap((screen) => {
      const top = (screen.path ?? "").split("/").filter(Boolean)[0];
      return top && !top.startsWith(":") ? [top] : [];
    }),
  ),
].sort();
