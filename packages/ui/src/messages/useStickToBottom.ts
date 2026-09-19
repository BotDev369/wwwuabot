/**
 * Стрічка переписки тримається низу — хук, а не код у компоненті.
 *
 * **Навіщо окремо.** Це стан, а не розмітка: стрічка мусить показувати
 * найсвіжіше (низ), а не найстаріше (верх). Без цього відкрита розмова
 * починалась би з повідомлень тижневої давнини, і людина щоразу гортала б її
 * руками — а після надсилання мусила б гортати ще раз.
 *
 * `useLayoutEffect` — щоб стрибок не було видно: `useEffect` смикає стрічку
 * **після** малювання кадру, і це виглядає як блимок.
 *
 * @module @wwwuabot/ui/messages
 */

import { useLayoutEffect, useRef, type RefObject } from "react";

/** Реф, який треба повісити на тіло стрічки. */
export function useStickToBottom(
  /** Зміна цього числа — привід притиснути: у стрічки додався рядок. */
  rows: number,
): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [rows]);

  return ref;
}
