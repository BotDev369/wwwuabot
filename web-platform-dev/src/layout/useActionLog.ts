/**
 * Наскрізне логування дотиків: **один рядок на кожне натискання** — кнопка,
 * вкладка, картка, поле. Слухач на `document` у фазі перехоплення, тож бачить і
 * те, що з'явилось у модалці; скільки писати, вирішує сервер (`event_log_full`).
 *
 * @module web-platform-dev/src/layout/useActionLog
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { apiFetch } from "@/shared/api/client";
import { choiceOf, gestureOf, type Gesture } from "@/app/action-label";
import { screenKeyOfPath } from "@/app/screens";

type GestureKind = "click" | "input";

export function useActionLog(): void {
  const { pathname } = useLocation();
  const screen = screenKeyOfPath(pathname);

  useEffect(() => {
    function send(kind: GestureKind, gesture: Gesture): void {
      void apiFetch("/api/user/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, screen, label: gesture.label, target: gesture.target }),
      }).catch(() => {
        // Журнал не входить у роботу екрана: наступний дотик спробує знову.
      });
    }

    function onClick(event: MouseEvent): void {
      const gesture = gestureOf(event.target as Element | null);
      if (gesture) send("click", gesture);
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
  }, [screen]);
}
