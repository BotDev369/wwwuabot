/**
 * Дії в застосунку: натискання й вибір у полі. Перехід пише «відкрив
 * сторінку», поверхня — «відкрив модалку», тож дотик скасовується
 * (`platform-journal`); набраний текст не пишеться взагалі — його наслідок уже
 * є рядком сервера (`docs/EVENTS.md`).
 *
 * @module web-platform-dev/src/layout/useActionLog
 */

import { useContext, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ScreenChromeContext } from "@wwwuabot/ui/nav";
import { screenLabel } from "@wwwuabot/shared/events";
import { apiFetch } from "@/shared/api/client";
import { choiceOf, gestureOf, type Gesture } from "@/app/action-label";
import { screenKeyOfPath } from "@/app/screens";
import { holdClick } from "./platform-journal";

type GestureKind = "click" | "input";

/** Перехід за посиланням — не дія, а навігація: її пише «відкрив сторінку». */
function isNavigation(control: Element): boolean {
  const link = control.closest("a[href]");
  if (!link) return false;
  const href = link.getAttribute("href") ?? "";
  return href.startsWith("/") || href.startsWith("#");
}

export function useActionLog(): void {
  const { pathname } = useLocation();
  const chrome = useContext(ScreenChromeContext)?.chrome;
  const screen = screenKeyOfPath(pathname);
  // Назва сторінки, на якій діє людина: товар у модалці на «GalyaShop» і товар
  // у модалці на «Обране» — різні речі, а підпис кнопки в них однаковий.
  const page = chrome?.title ?? screenLabel(screen);

  useEffect(() => {
    function send(kind: GestureKind, gesture: Gesture, at: number = Date.now()): void {
      void apiFetch("/api/user/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Дотик після навігації таки має дійти: звичайний `fetch` гине разом зі
        // сторінкою, і саме так губилися натискання «Назад».
        keepalive: true,
        body: JSON.stringify({
          kind,
          screen,
          page,
          label: gesture.label,
          field: gesture.field,
          at,
        }),
      }).catch(() => {
        // Журнал не входить у роботу екрана: наступний дотик спробує знову.
      });
    }

    function onClick(event: MouseEvent): void {
      const target = event.target as Element | null;
      if (!target || isNavigation(target)) return;
      const gesture = gestureOf(target);
      if (!gesture) return;
      // Час дотику, а не час, коли встигли записати: дотик чекає поверхню.
      const at = Date.now();
      // Дотик, що відкриє сторінку чи модалку, скасується сам — див. вище.
      holdClick(() => send("click", gesture, at), gesture.label);
    }

    function onChange(event: Event): void {
      const gesture = choiceOf(event.target as Element | null);
      if (gesture) send("input", gesture);
    }

    document.addEventListener("click", onClick, true);
    document.addEventListener("change", onChange, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("change", onChange, true);
    };
  }, [screen, page]);
}
