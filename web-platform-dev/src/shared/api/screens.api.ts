/**
 * Екрани платформи з `api-dev`: дерево одним запитом і слова одного екрана.
 *
 * @module web-platform-dev/src/shared/api/screens.api
 */

import type { ScreenRow, ScreenTexts } from "@wwwuabot/shared/screens";
import { apiFetch } from "./client";

interface ScreensResponse {
  ok: boolean;
  screens?: ScreenRow[];
}

interface ScreenTextsResponse {
  ok: boolean;
  texts?: ScreenTexts;
}

/** Дерево екранів: назви, батьки, меню й слова — усе однією відповіддю. */
export async function fetchScreens(): Promise<ScreenRow[]> {
  const data = await apiFetch<ScreensResponse>("/api/screens");
  return data.screens ?? [];
}

/** Слова одного екрана; лишається для сторінок, які читають їх самі. */
export async function fetchScreenTexts(key: string): Promise<ScreenTexts> {
  const data = await apiFetch<ScreenTextsResponse>(`/api/screens/${encodeURIComponent(key)}`);
  return data.texts ?? {};
}
