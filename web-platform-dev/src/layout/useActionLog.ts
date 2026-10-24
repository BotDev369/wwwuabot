/**
 * Дії в застосунку: натискання, вибір у полі й уведений текст. Перехід пише
 * «відкрив сторінку», поверхня — «відкрив модалку», тож дотик, який до цього
 * призвів, скасовується (`platform-journal`). Слухач стоїть на `document` у
 * фазі перехоплення — бачить і поверхні, що з'явились щойно.
 *
 * @module web-platform-dev/src/layout/useActionLog
 */

import { useContext, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ScreenChromeContext } from "@wwwuabot/ui/nav";
import { screenLabel } from "@wwwuabot/shared/events";
import { apiFetch } from "@/shared/api/client";
import { choiceOf, entryOf, gestureOf, type Gesture } from "@/app/action-label";
import { screenKeyOfPath } from "@/app/screens";
import { holdClick } from "./platform-journal";

type GestureKind = "click" | "input";

/** Пауза після останньої літери: людина пише, а не натискає по одній. */
export const ENTRY_IDLE_MS = 700;

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

    // Набраний текст чекає паузи: рядок на кожну літеру описував би не дію, а
    // клавіатуру. Останнє надіслане значення не повторюється.
    const pending = new Map<Element, ReturnType<typeof setTimeout>>();
    const sent = new WeakMap<Element, string>();

    function flush(field: Element): void {
      const timer = pending.get(field);
      if (!timer) return;
      clearTimeout(timer);
      pending.delete(field);

      const gesture = entryOf(field);
      if (!gesture || sent.get(field) === gesture.label) return;
      sent.set(field, gesture.label);
      send("input", gesture);
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

    function onInput(event: Event): void {
      const field = event.target as Element | null;
      if (!field) return;
      const previous = pending.get(field);
      if (previous) clearTimeout(previous);
      // Порожнє поле й закритий секрет не стають рядком журналу.
      if (!entryOf(field)) {
        pending.delete(field);
        return;
      }
      pending.set(
        field,
        setTimeout(() => flush(field), ENTRY_IDLE_MS),
      );
    }

    function onFocusOut(event: Event): void {
      const field = event.target as Element | null;
      if (field) flush(field);
    }

    document.addEventListener("click", onClick, true);
    document.addEventListener("change", onChange, true);
    document.addEventListener("input", onInput, true);
    document.addEventListener("focusout", onFocusOut, true);
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("change", onChange, true);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("focusout", onFocusOut, true);
    };
  }, [screen, page]);
}
