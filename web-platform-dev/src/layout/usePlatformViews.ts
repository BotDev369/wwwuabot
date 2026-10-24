/**
 * «Відкрив сторінку» — рядок у журнал на навігацію, із **назвою з шапки**.
 * Ключ каже розділ, назва — що людина бачить («Трекери», «Кава вдома»). Назву
 * дає не DOM, а сам екран (`ScreenChromeContext`), тож вона не залежить від
 * того, коли встиг відрендеритись хедер.
 *
 * @module web-platform-dev/src/layout/usePlatformViews
 */

import { useContext, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { ScreenChromeContext } from "@wwwuabot/ui/nav";
import { apiFetch } from "@/shared/api/client";
import { screenKeyOfPath } from "@/app/screens";
import { cancelHeldClick } from "./platform-journal";

/** Пауза на заголовок: екран оголошує його ефектом уже після першого рендера. */
export const TITLE_WAIT_MS = 120;

/**
 * Скільки чекати назву, коли її ще немає: у сторінки контенту (магазин,
 * шаблон) вона приходить із даними, а це буває й кілька секунд. Час події
 * береться з переходу, тож чекання не зсуває його в історії.
 */
export const TITLE_FALLBACK_MS = 8000;

export function usePlatformViews(): void {
  const { pathname } = useLocation();
  const chrome = useContext(ScreenChromeContext)?.chrome;
  const screen = screenKeyOfPath(pathname);
  const reported = useRef<string | null>(null);
  const title = chrome?.title ?? null;
  // Коли людина **перейшла**, а не коли назва нарешті прийшла. Час живе в ref:
  // його ставить ефект, а не рендер (у рендері `Date.now()` — нечиста функція).
  const openedAt = useRef<{ key: string; at: number } | null>(null);

  useEffect(() => {
    const key = `${screen}:${pathname.replace(/\/+$/, "") || "/"}`;
    if (reported.current === key) return;
    if (openedAt.current?.key !== key) openedAt.current = { key, at: Date.now() };
    const at = openedAt.current.at;

    const timer = setTimeout(
      () => {
        reported.current = key;
        // Перехід — це вже інша подія, ніж дотик, що його викликав.
        cancelHeldClick();
        void apiFetch("/api/user/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Перехід може закінчитися перезавантаженням — рядок мусить дійти.
          keepalive: true,
          // Порожню назву не шлемо: порожній `title` сервер відхиляє цілком,
          // і тоді зникає сама подія (так губився магазин).
          body: JSON.stringify(title ? { screen, title, at } : { screen, at }),
        }).catch(() => {
          // Звіт не входить у навігацію: не вдалось — наступна сторінка спробує.
        });
      },
      title ? TITLE_WAIT_MS : TITLE_FALLBACK_MS,
    );

    return () => clearTimeout(timer);
    // Назва приходить пізніше за адресу: її поява перезапускає паузу, щоб
    // рядок пішов із тим, що людина бачить.
  }, [pathname, screen, title]);
}
