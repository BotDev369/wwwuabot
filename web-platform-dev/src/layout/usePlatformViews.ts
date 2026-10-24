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

export function usePlatformViews(): void {
  const { pathname } = useLocation();
  const chrome = useContext(ScreenChromeContext)?.chrome;
  const screen = screenKeyOfPath(pathname);
  const reported = useRef<string | null>(null);
  const title = chrome?.title ?? null;

  useEffect(() => {
    const key = `${screen}:${pathname.replace(/\/+$/, "") || "/"}`;
    if (reported.current === key) return;

    const timer = setTimeout(() => {
      reported.current = key;
      // Перехід — це вже інша подія, ніж дотик, що його викликав.
      cancelHeldClick();
      void apiFetch("/api/user/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Перехід може закінчитися перезавантаженням — рядок мусить дійти.
        keepalive: true,
        body: JSON.stringify({ screen, title }),
      }).catch(() => {
        // Звіт не входить у навігацію: не вдалось — наступна сторінка спробує.
      });
    }, TITLE_WAIT_MS);

    return () => clearTimeout(timer);
    // Назва приходить із хедера вже після першого рендера: її зміна перезапускає
    // паузу, щоб рядок пішов із тим, що людина бачить.
  }, [pathname, screen, title]);
}
