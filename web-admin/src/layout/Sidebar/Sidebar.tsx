import { useSidebar } from "./useSidebar";
import { SidebarNav } from "./SidebarNav";
import { logout } from "../../shared/api/auth.api";
import { ThemeToggle } from "@wwwuabot/shared/components/ThemeToggle";

export function Sidebar() {
  const collapsed = useSidebar((s) => s.collapsed);
  const toggle = useSidebar((s) => s.toggle);

  async function handleLogout() {
    await logout();
    window.location.reload();
  }

  return (
    <aside className={`sidebar${collapsed ? " sidebar--collapsed" : ""}`}>
      <div className="sidebar-header">
        {!collapsed && (
          <>
            <span className="sidebar-logo">✦</span>
            <span className="sidebar-title">WWWUABOT</span>
          </>
        )}
        <button
          type="button"
          className="sidebar-toggle"
          onClick={toggle}
          title={collapsed ? "Розгорнути" : "Згорнути"}
          aria-label={collapsed ? "Розгорнути бічне меню" : "Згорнути бічне меню"}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>
      </div>

      <SidebarNav />

      <div className="sidebar-footer">
        <ThemeToggle compact={collapsed} />
        <div style={{ height: 6 }} />
        <button type="button" className="logout-btn" onClick={handleLogout} title="Вийти">
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
          {!collapsed && <span>Вийти</span>}
        </button>
      </div>
    </aside>
  );
}
