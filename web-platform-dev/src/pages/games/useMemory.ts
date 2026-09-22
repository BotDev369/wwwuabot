/**
 * `useMemory` — стан партії «Знайди пару»: колода, відкриті картки, пауза.
 *
 * **Пауза живе в ефекті.** Невдалу пару треба показати перед тим, як закрити —
 * інакше картки блимнуть і людина не встигне побачити, що саме відкрила.
 * Тому закриття — це таймер, який ефект прибирає за собою: вихід зі сторінки
 * посеред показу не лишає ні таймера, ні пізнього `setState`.
 *
 * **Спроба — це два дотики, а не один.** Лічильник росте на другій картці:
 * одна відкрита картка ще нічого не коштувала.
 *
 * @module web-platform-dev/src/pages/games/useMemory
 */

import { useCallback, useEffect, useState } from "react";
import { type MemoryCard, deal, isDone, samePair } from "./memory";

/** Скільки невдала пара лишається відкритою — встигнути побачити, не чекати. */
const HIDE_MS = 700;

export interface UseMemoryResult {
  cards: readonly MemoryCard[];
  /** Індекси відкритих карток: одна або дві, доки триває показ. */
  open: readonly number[];
  /** Індекси знайдених карток — вони лишаються відкритими до кінця партії. */
  found: readonly number[];
  /** Спроби: скільки разів відкривалась пара. */
  attempts: number;
  done: boolean;
  flip: (at: number) => void;
  reset: () => void;
}

export function useMemory(random: () => number = Math.random): UseMemoryResult {
  const [cards, setCards] = useState(() => deal(random));
  const [open, setOpen] = useState<readonly number[]>([]);
  const [found, setFound] = useState<readonly number[]>([]);
  const [attempts, setAttempts] = useState(0);

  const done = isDone(found);

  useEffect(() => {
    if (open.length < 2) return;
    const [first, second] = open;
    if (first === undefined || second === undefined) return;

    const a = cards[first];
    const b = cards[second];
    const timer = setTimeout(() => {
      if (a && b && samePair(a, b)) setFound((prev) => [...prev, first, second]);
      setOpen([]);
    }, HIDE_MS);

    return () => clearTimeout(timer);
  }, [open, cards]);

  const flip = useCallback(
    (at: number): void => {
      // Третій дотик під час показу нічого не робить — пара вже вирішується
      if (open.length >= 2) return;
      if (open.includes(at) || found.includes(at)) return;
      setOpen((prev) => [...prev, at]);
      if (open.length === 1) setAttempts((prev) => prev + 1);
    },
    [open, found],
  );

  const reset = useCallback((): void => {
    setCards(deal(random));
    setOpen([]);
    setFound([]);
    setAttempts(0);
  }, [random]);

  return { cards, open, found, attempts, done, flip, reset };
}
