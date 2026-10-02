/**
 * `useCopyLink` — «Поділитись» як копіювання адреси.
 *
 * **Чому саме копіювання.** У Mini App немає системного меню «поділитись»,
 * яке можна відкрити, а посилання треба кудись передати: у чат, у закладки,
 * на інший пристрій. Тому дія чесна — кладе адресу в буфер, а знак змінюється
 * на галочку, щоб було видно, що вийшло.
 *
 * **Адресу дає екран**, а не хедер: він один знає, що саме тут можна
 * передати далі (сторінка, профіль людини), а «поточний `location`» — це адреса
 * з параметрами, яких інша людина не відкриє.
 *
 * @module packages/ui/src/nav/useCopyLink
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { copyText } from "@wwwuabot/shared/utils/clipboard";

/** Скільки триває галочка після копіювання. */
const DONE_MS = 1600;

export function useCopyLink(url: string): { copied: boolean; copy: () => void } {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    void copyText(url).then((ok: boolean) => {
      setCopied(ok);
      if (!ok) return;
      timer.current = setTimeout(() => setCopied(false), DONE_MS);
    });
  }, [url]);

  return { copied, copy };
}
