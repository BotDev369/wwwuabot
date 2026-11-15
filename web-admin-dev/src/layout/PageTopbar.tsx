import type { ReactNode } from "react";

interface PageTopbarProps {
  children: ReactNode;
  /** Додатковий клас сторінки поверх `.wb-topbar` — для її власних станів. */
  className?: string;
}

/** Шапка сторінки — спільний кирпичик `.wb-topbar` (див. `app-chrome.css`). */
export function PageTopbar({ children, className }: PageTopbarProps) {
  return <header className={className ? `wb-topbar ${className}` : "wb-topbar"}>{children}</header>;
}
