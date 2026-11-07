/**
 * Тексти екрана з його рядка `scenarios`: один запит на екран, кеш на сесію.
 *
 * Поки текстів немає, екран каже `ready: false` — і не малює ні слів, ні
 * заглушок: типового тексту в коді немає навмисно (`docs/SCREEN_TEXTS.md`).
 *
 * @module web-platform-dev/src/pages/screen-texts/useScreenTexts
 */

import { useEffect, useState } from "react";
import type { ScreenTexts } from "@wwwuabot/shared/screens";
import { fetchScreenTexts } from "@/shared/api/screens.api";

export interface ScreenTextsState {
  texts: ScreenTexts;
  ready: boolean;
}

/** Прочитане за сесію: екран, який відкрили вдруге, не чекає мережі. */
const cache = new Map<string, ScreenTexts>();
/** Ті самі тексти, запитані двічі одночасно, їдуть одним запитом. */
const inFlight = new Map<string, Promise<ScreenTexts>>();

interface StoredState extends ScreenTextsState {
  key: string;
}

export function useScreenTexts(key: string): ScreenTextsState {
  const [stored, setStored] = useState<StoredState>(() => ({
    key,
    texts: cache.get(key) ?? {},
    ready: cache.has(key),
  }));

  useEffect(() => {
    if (cache.has(key)) return;

    let live = true;
    let request = inFlight.get(key);
    if (!request) {
      request = fetchScreenTexts(key).catch((): ScreenTexts => ({}));
      inFlight.set(key, request);
    }

    void request.then((texts) => {
      cache.set(key, texts);
      inFlight.delete(key);
      if (live) setStored({ key, texts, ready: true });
    });

    return () => {
      live = false;
    };
  }, [key]);

  // Інший ключ не чекає ефекту: кешовані слова віддаються з першого рендера.
  const current: StoredState =
    stored.key === key ? stored : { key, texts: cache.get(key) ?? {}, ready: cache.has(key) };
  return { texts: current.texts, ready: current.ready };
}

/** Забути прочитане: потрібно тестам і правці тексту без перезавантаження. */
export function forgetScreenTexts(key?: string): void {
  if (key) cache.delete(key);
  else cache.clear();
}
