/**
 * Реєстр екранів: один запит на сесію й один власник даних для всього каркаса.
 *
 * @module web-platform-dev/src/layout/ScreensProvider
 */

import { useEffect, useState, type ReactElement, type ReactNode } from "react";
import { loadScreens } from "./screens-cache";
import { EMPTY_SCREENS, ScreensContext, type ScreensState } from "./useScreens";

export function ScreensProvider({ children }: { children: ReactNode }): ReactElement {
  const [state, setState] = useState<ScreensState>(EMPTY_SCREENS);

  useEffect(() => {
    if (state.ready) return;
    let live = true;
    void loadScreens().then((rows) => {
      if (!live) return;
      setState({ rows, ready: true, byKey: new Map(rows.map((row) => [row.key, row])) });
    });
    return () => {
      live = false;
    };
  }, [state.ready]);

  return <ScreensContext.Provider value={state}>{children}</ScreensContext.Provider>;
}
