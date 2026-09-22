/**
 * Правила «Знайди пару» — колода, пара, кінець партії.
 *
 * Тут немає ні часу, ні перевертання: **правило одне** — дві картки з тим
 * самим знаком складають пару. Усе інше (скільки карток відкрито, коли їх
 * закрити) — стан екрана, і воно живе в хуку (`useMemory`), бо закриття
 * невдалої пари залежить від паузи, а пауза — не правило гри.
 *
 * **Знаки — з реєстру іконок**, а не літери й не емодзі: вони мусять
 * лишатись однаковими в будь-якій темі, і жодного разу не залежати від
 * шрифту, який людина собі вибрала (`IconName`).
 *
 * @module web-platform-dev/src/pages/games/memory
 */

import type { IconName } from "@wwwuabot/shared";

/**
 * Знак пари: іконка з реєстру і **слово** до неї.
 *
 * Слово потрібне не для краси: у знака мусить бути ім'я, яке прочитає той, хто
 * не бачить екрана (`aria-label`). Ім'я іконки — «sparkles» — для цього не
 * годиться.
 */
export interface MemorySymbol {
  icon: IconName;
  label: string;
}

/**
 * Вісім знаків — це 4×4, дошка, яка вміщається на екрані телефона без
 * прокрутки. Більше пар означало б дрібні картки і партію на півгодини.
 */
export const SYMBOLS: readonly MemorySymbol[] = [
  { icon: "heart", label: "серце" },
  { icon: "star", label: "зірка" },
  { icon: "sun", label: "сонце" },
  { icon: "moon", label: "місяць" },
  { icon: "sparkles", label: "іскри" },
  { icon: "globe", label: "глобус" },
  { icon: "camera", label: "камера" },
  { icon: "shop", label: "крамниця" },
];

/** Скільки карток у колоді — по дві на кожен знак. */
export const DECK_SIZE = SYMBOLS.length * 2;

export interface MemoryCard {
  /** Порядковий номер картки в колоді — він же її адреса при перевертанні. */
  id: number;
  /** Який знак на картці: дві картки з однаковим `pair` — пара. */
  pair: number;
}

/** Знак картки — з реєстру, а не з її номера: екран не має знати про порядок. */
export function symbolOf(card: MemoryCard): MemorySymbol {
  return SYMBOLS[card.pair] ?? { icon: "star", label: "зірка" };
}

/** Чи ці дві картки — пара. */
export function samePair(a: MemoryCard, b: MemoryCard): boolean {
  return a.pair === b.pair;
}

/**
 * Роздача: кожен знак — двічі, і все перемішано.
 *
 * **Тасують позиції, а не знаки.** Якби знаки кидались у випадкові клітинки,
 * один знак міг би лягти тричі — а колода мусить бути рівно по дві картки.
 */
export function deal(random: () => number = Math.random): MemoryCard[] {
  const cards: MemoryCard[] = [];
  for (let pair = 0; pair < SYMBOLS.length; pair++) {
    cards.push({ id: pair * 2, pair }, { id: pair * 2 + 1, pair });
  }

  for (let i = cards.length - 1; i > 0; i--) {
    const at = Math.min(i, Math.floor(random() * (i + 1)));
    const swap = cards[at];
    const here = cards[i];
    if (swap === undefined || here === undefined) continue;
    cards[at] = here;
    cards[i] = swap;
  }

  return cards;
}

/** Партія скінчена, коли відкриті всі пари. */
export function isDone(found: readonly number[]): boolean {
  return found.length >= DECK_SIZE;
}
