/**
 * `useFishing` — партія «Веселої рибалки» в часі.
 *
 * **Час живе тут, і тільки тут.** Правила (`fishing.ts`) дістають стан і
 * відрізок часу; хто цей відрізок міряє — знає лише цей хук. Тому правила
 * перевіряються без екрана, а екран не тримає ні таймерів, ні кадрів.
 *
 * **Стан веде `ref`, а не `useState`.** Кадрів шістдесят на секунду, і кожен
 * наступний читає те, що зробив попередній: якби крок рахувався у
 * функціональному `setState`, у строгому режимі React викликав би його двічі,
 * і з одного кадру народилися б дві риби. `ref` — джерело правди, `state` —
 * те, що видно на екрані.
 *
 * **Кадр не наздоганяє пропущене.** Таб у фоні не шле кадрів, і перший
 * повернувся кадр приніс би кілька секунд одразу: риба за одну мить пролетіла
 * б увесь шлях і впала б у чужу смугу. Тому відрізок обмежений (`MAX_FRAME_MS`).
 *
 * @module web-platform-dev/src/pages/games/useFishing
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  moveTo as moveWolfTo,
  startFishing,
  step as stepWolf,
  tick,
  type FishingEvent,
  type FishingState,
} from "./fishing";

/** Скільки часу зараховується одному кадру — межа для того, хто вернувся в таб. */
const MAX_FRAME_MS = 64;

/** Остання подія партії: номер потрібен, щоб рух на екрані **перезапускався**. */
export interface FishingFlash {
  id: number;
  event: FishingEvent;
}

export interface UseFishingResult {
  state: FishingState;
  /** `null`, поки в партії нічого не сталось. */
  flash: FishingFlash | null;
  /** Дотик по смузі: вовк іде туди, а не переноситься. */
  moveTo: (lane: number) => void;
  /** Крок на смугу — для стрілок. */
  step: (direction: -1 | 1) => void;
  reset: () => void;
}

export function useFishing(): UseFishingResult {
  const [state, setState] = useState<FishingState>(startFishing);
  // Початкове значення — **з стану**, а не читанням `ref.current` під час
  // малювання: у `ref` лежить те саме, і дві адреси правди не з'являється
  const stateRef = useRef(state);
  const [flash, setFlash] = useState<FishingFlash | null>(null);
  const flashed = useRef(0);
  const over = state.over;

  /** Одна адреса запису: `ref` і те, що видно, міняються разом — розійтись не можуть. */
  const apply = useCallback((next: FishingState): void => {
    stateRef.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    if (over) return;
    let frame = 0;
    let last = performance.now();

    const advance = (now: number): void => {
      const dt = Math.min(MAX_FRAME_MS, now - last);
      last = now;

      const result = tick(stateRef.current, dt, Math.random);
      apply(result.state);

      // Показуємо останню подію кадру: якщо за один кадр їх кілька (риба +
      // рівень), словами можна сказати тільки про одну — і це та, що важливіша
      const event = result.events[result.events.length - 1];
      if (event) {
        flashed.current += 1;
        setFlash({ id: flashed.current, event });
      }

      if (!result.state.over) frame = requestAnimationFrame(advance);
    };

    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [over, apply]);

  const moveTo = useCallback(
    (lane: number): void => {
      apply(moveWolfTo(stateRef.current, lane));
    },
    [apply],
  );

  const step = useCallback(
    (direction: -1 | 1): void => {
      apply(stepWolf(stateRef.current, direction));
    },
    [apply],
  );

  const reset = useCallback((): void => {
    apply(startFishing());
    setFlash(null);
  }, [apply]);

  return { state, flash, moveTo, step, reset };
}
