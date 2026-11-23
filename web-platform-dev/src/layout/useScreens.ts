/**
 * Реєстр екранів: контекст і читання (`ready: false` — каркас не вигадує назв).
 *
 * @module web-platform-dev/src/layout/useScreens
 */

import { createContext, useContext } from "react";
import type { ScreenRow } from "@wwwuabot/shared/screens";

export interface ScreensState {
  rows: readonly ScreenRow[];
  ready: boolean;
  byKey: ReadonlyMap<string, ScreenRow>;
}

export const EMPTY_SCREENS: ScreensState = { rows: [], ready: false, byKey: new Map() };

export const ScreensContext = createContext<ScreensState>(EMPTY_SCREENS);

/** Екрани й пошук за ключем; поки не приїхали — порожньо, без заглушок. */
export function useScreens(): ScreensState {
  return useContext(ScreensContext);
}
