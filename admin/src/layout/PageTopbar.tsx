import type { ReactNode } from "react";

interface PageTopbarProps {
  children: ReactNode;
}

export function PageTopbar({ children }: PageTopbarProps) {
  return <header className="topbar">{children}</header>;
}