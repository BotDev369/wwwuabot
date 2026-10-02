/**
 * `ScreenChromeProvider` — власник стану хедера.
 *
 * Стан один на весь застосунок, тож і власник один: `PlatformShell` стоїть
 * найвище від усіх екранів. Злиття патча зі станом — в `mergeChrome`, а сам
 * провайдер лише тримає його, щоб правило залишалося чистою функцією, яку
 * перевіряє тест без рендеру.
 *
 * @module packages/ui/src/nav/ScreenChromeProvider
 */

import { useCallback, useMemo, useState, type ReactElement, type ReactNode } from "react";
import {
  EMPTY_CHROME,
  ScreenChromeContext,
  mergeChrome,
  type ScreenChromeApi,
  type ScreenChromePatch,
} from "./screen-chrome";

export function ScreenChromeProvider({ children }: { children: ReactNode }): ReactElement {
  const [chrome, setChrome] = useState(EMPTY_CHROME);

  const update = useCallback(
    (patch: ScreenChromePatch) => setChrome((prev) => mergeChrome(prev, patch)),
    [],
  );

  const api = useMemo<ScreenChromeApi>(() => ({ chrome, update }), [chrome, update]);

  return <ScreenChromeContext.Provider value={api}>{children}</ScreenChromeContext.Provider>;
}
