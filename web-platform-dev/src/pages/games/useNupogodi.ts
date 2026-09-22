/**
 * `useNupogodi` — партія «Ну, погоди!» у часі.
 *
 * **Час живе тут, і тільки тут.** Правила (`nupogodi.ts`) дістають стан і
 * відрізок часу; хто цей відрізок міряє — знає лише цей хук. Тому правила
 * перевіряються без екрана, а екран не тримає ні таймерів, ні кадрів.
 *
 * **Стан веде `ref`, а не `useState`.** Кадрів шістдесят на секунду, і кожен
 * наступний читає те, що зробив попередній: якби крок рахувався у
 * функціональному `setState`, у строгому режимі React викликав би його двічі,
 * і з одного кадру народилися б два яйця. `ref` — джерело правди, `state` —
 * те, що видно на екрані.
 *
 * **Кадр не наздоганяє пропущене.** Таб у фоні не шле кадрів, і перший
 * повернувся кадр приніс би кілька секунд одразу: яйце за одну мить прокотило
 * б усю доріжку й впало б у чужій смузі. Тому відрізок обмежений
 * (`MAX_FRAME_MS`).
 *
 * @module web-platform-dev/src/pages/games/useNupogodi
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  moveTo as moveWolfTo,
  startNupogodi,
  step as stepWolf,
  tick,
  type NupogodiEvent,
  type NupogodiState,
} from "./nupogodi";

/** Скільки часу зараховується одному кадру — межа для того, хто вернувся в таб. */
const MAX_FRAME_MS = 64;

/** Остання подія партії: номер потрібен, щоб рух і звук на екрані **перезапускались**. */
export interface NupogodiFlash {
  id: number;
  event: NupogodiEvent;
}

export interface UseNupogodiResult {
  state: NupogodiState;
  /** `null`, поки в партії нічого не сталось. */
  flash: NupogodiFlash | null;
  /** Дотик по доріжці: вовк іде туди, а не переноситься. */
  moveTo: (lane: number) => void;
  /** Крок на доріжку — для стрілок. */
  step: (direction: -1 | 1) => void;
  reset: () => void;
}

export function useNupogodi(): UseNupogodiResult {
  const [state, setState] = useState<NupogodiState>(startNupogodi);
  // Початкове значення — **з стану**, а не читанням `ref.current` під час
  // малювання: у `ref` лежить те саме, і дві адреси правди не зʼявляється
  const stateRef = useRef(state);
  const [flash, setFlash] = useState<NupogodiFlash | null>(null);
  const flashed = useRef(0);
  const over = state.over;

  /** Одна адреса запису: `ref` і те, що видно, міняються разом — розійтись не можуть. */
  const apply = useCallback((next: NupogodiState): void => {
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

      // Показуємо останню подію кадру: якщо за один кадр їх кілька (яйце +
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
    apply(startNupogodi());
    setFlash(null);
  }, [apply]);

  return { state, flash, moveTo, step, reset };
}
