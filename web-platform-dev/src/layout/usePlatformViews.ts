/**
 * «Відкрив екран» — рядок у журнал на навігацію; повторний той самий ключ
 * підряд не рахується, а помилка звіту ковтається: журнал не має права ламати
 * навігацію.
 *
 * @module web-platform-dev/src/layout/usePlatformViews
 */

import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { apiFetch } from "@/shared/api/client";
import { screenKeyOfPath } from "@/app/screens";

export function usePlatformViews(): void {
  const { pathname } = useLocation();
  const reported = useRef<string | null>(null);

  useEffect(() => {
    const screen = screenKeyOfPath(pathname);
    if (reported.current === screen) return;
    reported.current = screen;

    void apiFetch("/api/user/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ screen }),
    }).catch(() => {
      // Звіт не входить у навігацію: не вдалось — наступний екран спробує знову.
    });
  }, [pathname]);
}
