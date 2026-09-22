/**
 * `useGameSound` — звук партії з перемикачем.
 *
 * **Вимкнений звук — це стан людини, а не браузера.** Тому перемикач
 * зберігається (`localStorage`) і переживає вихід із гри: вимкнути музику
 * щоразу заново — це та дрібниця, через яку звук вимикають назавжди.
 *
 * **Звук розблоковують дотиком.** `AudioContext` до першого дотику спить, і
 * партія починається сама — тож перший звук може не прозвучати. Слухачі
 * `pointerdown`/`keydown` тут саме для цього: людина торкнеться кошика, і
 * курник заговорить.
 *
 * @module web-platform-dev/src/pages/games/useGameSound
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createSoundKit, type GameSound } from "./sound";

/** Ключ перемикача: гра просить його в того самого сховища, що й тема. */
const KEY = "wb:game-sound";

/** Замовчування — **увімкнено**: звук просили, а не дістали як опцію. */
function readOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== "0";
  } catch {
    // `localStorage` може бути недоступним (приватний режим) — тоді просто грає
    return true;
  }
}

function store(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* ignore — вибір не зберігся, але партія не зламалась */
  }
}

export interface UseGameSoundResult {
  on: boolean;
  toggle: () => void;
  play: (sound: GameSound) => void;
}

export function useGameSound(): UseGameSoundResult {
  const [on, setOn] = useState(readOn);
  const kitRef = useRef<ReturnType<typeof createSoundKit> | null>(null);
  const kit = (kitRef.current ??= createSoundKit());

  // Вибір зберігається ефектом, а не в обробнику: так він не губиться, якщо
  // стан поміняють не кнопкою (а це вже станеться, коли звук дійде до теми)
  useEffect(() => {
    store(on);
  }, [on]);

  useEffect(() => {
    const unlock = (): void => kit.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [kit]);

  useEffect(() => () => kit.close(), [kit]);

  const play = useCallback(
    (sound: GameSound): void => {
      if (on) kit.play(sound);
    },
    [kit, on],
  );

  const toggle = useCallback((): void => {
    setOn((was) => !was);
  }, []);

  return { on, toggle, play };
}
