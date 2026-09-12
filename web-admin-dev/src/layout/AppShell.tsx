import { Outlet } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
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
    <div className="wb-app">
      {isMobile && open && <div className="app-drawer-overlay" onClick={close} />}
      <Sidebar open={isMobile && open} onNavigate={close} />
      <div className="wb-app-main">
        <header className="wb-app-header">
          {/* Той самий клас і та сама розмітка, що в гамбургері PageRenderer:
              на мобільному обидві оболонки мають однакову кнопку меню. */}
          <button
            type="button"
            className="hamburger wb-app-hamburger"
            onClick={toggle}
            aria-label={open ? "Закрити меню" : "Відкрити меню"}
            aria-expanded={open}
          >
            <span />
            <span />
            <span />
          </button>
          <span className="wb-app-title">WWWUABOT Admin</span>
          <button type="button" className="wb-app-logout" onClick={handleLogout}>
            <Icon name="logout" size={16} />
            <span>Вийти</span>
          </button>
        </header>
        <main className="wb-app-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
