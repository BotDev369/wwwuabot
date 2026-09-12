import { Outlet } from "react-router-dom";
import { icons } from "@wwwuabot/shared";
import { Sidebar } from "./Sidebar/Sidebar";
import { useIsMobile } from "./useIsMobile";
import { useMobileNav } from "./useMobileNav";
import { logout } from "../shared/api/auth.api";

export function AppShell() {
  const isMobile = useIsMobile();
  const { open, toggle, close } = useMobileNav();

  async function handleLogout() {
    await logout();
    window.location.reload();
  }

  return (
    <div className="app-root">
      {isMobile && open && <div className="sidebar-overlay" onClick={close} />}
      <Sidebar open={isMobile && open} onNavigate={close} />
      <div className="main-wrapper">
        <header className="main-header">
          <button
            type="button"
            className="main-header-hamburger"
            onClick={toggle}
            aria-label={open ? "Закрити меню" : "Відкрити меню"}
            aria-expanded={open}
          >
            {icons["menu"]}
          </button>
          <span className="main-header-title">WWWUABOT Admin</span>
          <button
            type="button"
            className="main-header-logout"
            onClick={handleLogout}
            title="Вийти з адмінки"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Вийти</span>
          </button>
        </header>
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
