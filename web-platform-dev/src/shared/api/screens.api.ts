/**
 * Тексти екрана з `api-dev`: одна ручка на всі екрани, ключ — у адресі.
 *
 * @module web-platform-dev/src/shared/api/screens.api
 */

import type { ScreenTexts } from "@wwwuabot/shared/screens";
import { apiFetch } from "./client";

interface ScreenTextsResponse {
  ok: boolean;
  texts?: ScreenTexts;
}

export async function fetchScreenTexts(key: string): Promise<ScreenTexts> {
  const data = await apiFetch<ScreenTextsResponse>(`/api/screens/${encodeURIComponent(key)}`);
  return data.texts ?? {};
}
