/**
 * Стан хедера екрана — хтось один має його власником.
 *
 * **Чому контекст, а не пропси.** Хедер живе в каркасі (`PlatformShell`), а
 * знає про себе екран: назву сторінки, чи є в неї меню, що можна скопіювати й
 * на що поставити серце. Прокидати це пропсами з каркасу в кожен екран —
 * означало б друге місце, де вирішується, «що показувати в шапці»; контекст
 * лишає рішення екрану, а малює хедер один кирпичик.
 *
 * **Об'єкт, а не булеві прапорці.** `null` означає «цієї дії тут немає»
 * (екран без меню, без серця), `undefined` — «не змінюй те, що є». Тому
 * екран оновлює лише те, що його стосується, і не зносить чужі поля.
 *
 * @module packages/ui/src/nav/screen-chrome
 */

import { createContext } from "react";
import type { FavoriteTarget } from "@wwwuabot/shared/favorites";

/** Що екран розповідає про себе хедеру. */
export interface ScreenChrome {
  /** Назва екрана — те, що стоїть ліворуч від дій. */
  title: string | null;
  /** Відкрити власне меню сторінки (бургер); `null` — меню немає. */
  menu: (() => void) | null;
  /** Адреса, яку «Поділитись» копіює; `null` — кнопки немає. */
  shareUrl: string | null;
  /** На що ставиться серце; `null` — серця немає. */
  favorite: FavoriteTarget | null;
  /** Показати палітру теми. У профілі — `false`: тема звідти й так відкрита. */
  theme: boolean;
}

/** Що екран оновлює: змінені поля + `null`, щоб прибрати дію. */
export type ScreenChromePatch = {
  [K in keyof ScreenChrome]?: ScreenChrome[K] | null;
};

export interface ScreenChromeApi {
  chrome: ScreenChrome;
  update: (patch: ScreenChromePatch) => void;
}

/** Стан за замовчуванням: лише назва, жодної дії. */
export const EMPTY_CHROME: ScreenChrome = {
  title: null,
  menu: null,
  shareUrl: null,
  favorite: null,
  theme: true,
};

/**
 * `null` у контексті — «шапки тут немає» (наприклад, попередній перегляд у
 * адмінці): екрани тоді просто не малюють хедер, а не падають.
 */
export const ScreenChromeContext = createContext<ScreenChromeApi | null>(null);

/**
 * Злиття патчу зі станом: `undefined` — не чіпати, `null` — прибрати дію.
 *
 * **Повертає той самий об'єкт, коли нічого не змінилося.** Екрани оголошують
 * себе під час рендеру, тож без цієї перевірки новий об'єкт на кожному кроці
 * ганяв би рендер по колу.
 */
export function mergeChrome(prev: ScreenChrome, patch: ScreenChromePatch): ScreenChrome {
  const next = { ...prev };
  let changed = false;
  for (const key of Object.keys(patch) as (keyof ScreenChrome)[]) {
    const value = patch[key];
    if (value === undefined || sameValue(next[key], value)) continue;
    (next[key] as unknown) = value;
    changed = true;
  }
  return changed ? next : prev;
}

/**
 * Порівняння значення поля. Об'єкти (наприклад, «що любити») звіряємо за
 * змістом: екран створює їх на кожному рендері, і без цього хедер вважав би
 * себе зміненим навіть тоді, коли серце те саме.
 */
function sameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}
