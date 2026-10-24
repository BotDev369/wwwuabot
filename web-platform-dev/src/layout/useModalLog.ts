/**
 * «Відкрив вікно» — рядок у журнал на кожну поверхню, яку людина відкрила.
 * Модалки живуть не в адресі, а в кирпичику `role="dialog"` із назвою в шапці
 * (`MenuModal`, діалог, редактори, форми), тож їх ловить спостерігач за DOM — і
 * пише те, що видно на екрані: товар, кошик, тему, контакт.
 *
 * @module web-platform-dev/src/layout/useModalLog
 */

import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { apiFetch } from "@/shared/api/client";
import { screenKeyOfPath } from "@/app/screens";
import { claimHeldClick } from "./platform-journal";

/** Назва поверхні: `aria-label` шапки або її заголовок. */
function titleOf(dialog: Element): string {
  const label = dialog.getAttribute("aria-label")?.trim();
  if (label) return label;
  const heading = dialog.querySelector(".wb-modal-title, h1, h2, h3");
  return heading?.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

/** Знайти поверхню в доданому вузлі (сам вузол або його нащадок). */
function dialogIn(node: Element): Element | null {
  if (node.matches('[role="dialog"]')) return node;
  return node.querySelector('[role="dialog"]');
}

export function useModalLog(): void {
  const { pathname } = useLocation();
  const screen = screenKeyOfPath(pathname);
  const seen = useRef(new WeakSet<Element>());

  useEffect(() => {
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          const dialog = dialogIn(node);
          if (!dialog || seen.current.has(dialog)) continue;
          seen.current.add(dialog);

          // Загальна шапка («Створити») не пояснює, що відкрили; підпис
          // натиснутого контрола («Створити нотатку») — пояснює.
          const pressed = claimHeldClick();
          const title = pressed ?? titleOf(dialog);
          if (!title) continue;
          void apiFetch("/api/user/event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            keepalive: true,
            body: JSON.stringify({ kind: "modal", screen, title }),
          }).catch(() => {
            // Журнал не ламає роботу з поверхнею.
          });
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [screen]);
}
