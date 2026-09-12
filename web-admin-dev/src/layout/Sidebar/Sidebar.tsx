import { Icon, ThemeButton } from "@wwwuabot/shared";
import { useCollapsedNav } from "./useCollapsedNav";
import { useSidebar } from "./useSidebar";
import { SidebarNav } from "./SidebarNav";
import { logout } from "../../shared/api/auth.api";

interface SidebarProps {
  /** Drawer відкрито — тільки на мобільному (`useIsMobile` у AppShell). */
  open?: boolean;
  /** Клік по пункту меню: на мобільному закриває drawer. */
  onNavigate?: () => void;
}

/**
 * Бічне меню адмінки.
 *
 * Розмітка — спільні кирпичики `.wb-nav*` із `@wwwuabot/shared/styles`
 * (вигляд, згорнутий стан, мобільний drawer). Тут лишається рівно те, чим
 * адмінка відрізняється від платформи: лого, склад пунктів і кнопка виходу.
 */
export function Sidebar({ open = false, onNavigate }: SidebarProps) {
  const collapsed = useCollapsedNav();
  const toggle = useSidebar((state) => state.toggle);

  async function handleLogout() {
    await logout();
    window.location.reload();
  }

  return (
    <aside
      className={`wb-nav app-drawer${collapsed ? " wb-nav--collapsed" : ""}${open ? " app-drawer--open" : ""}`}
    >
      <div className="wb-nav-header">
        {!collapsed && (
          <>
            <span className="wb-nav-logo">✦</span>
            <span className="wb-nav-title">WWWUABOT</span>
          </>
        )}
        <button
          type="button"
          className="wb-nav-toggle"
          onClick={toggle}
          title={collapsed ? "Розгорнути" : "Згорнути"}
          aria-label={collapsed ? "Розгорнути бічне меню" : "Згорнути бічне меню"}
        >
          <Icon name="sidebar-toggle" size={18} />
        </button>
      </div>

      {/* Theme button — top of nav, above Головна */}
      <div className="wb-nav-extra">
        <ThemeButton compact={collapsed} />
      </div>

      <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />

      <div className="wb-nav-footer">
        <button type="button" className="wb-app-logout" onClick={handleLogout} title="Вийти">
          <Icon name="logout" size={16} />
          {!collapsed && <span>Вийти</span>}
        </button>
      </div>
    </aside>
  );
}
