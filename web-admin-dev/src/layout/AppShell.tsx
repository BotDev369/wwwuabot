import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar/Sidebar";
import { logout } from "../shared/api/auth.api";

export function AppShell() {
  async function handleLogout() {
    await logout();
    window.location.reload();
  }

  return (
    <div className="app-root">
      <Sidebar />
      <div className="main-wrapper">
        <header className="main-header">
          <span className="main-header-title">WWWUABOT Admin</span>
          <button type="button" className="main-header-logout" onClick={handleLogout} title="Вийти з адмінки">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
