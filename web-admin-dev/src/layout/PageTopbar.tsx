import type { ReactNode } from "react";

interface PageTopbarProps {
  children: ReactNode;
}

/** Шапка сторінки — спільний кирпичик `.wb-topbar` (див. `app-chrome.css`). */
export function PageTopbar({ children }: PageTopbarProps) {
  return <header className="wb-topbar">{children}</header>;
}
