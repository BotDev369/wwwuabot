import { Icon, ThemeButton } from "@wwwuabot/shared";
import { SideBar } from "@wwwuabot/ui/nav";
import { useCollapsedNav } from "./useCollapsedNav";
import { useSidebar } from "./useSidebar";
import { SidebarNav } from "./SidebarNav";
import { logout } from "../../shared/api/auth.api";

interface SidebarProps {
  /** Drawer відкрито — тільки на мобільному (`useIsMobile` у AppShell). */
  open?: boolean;
  /** Клік по пункту меню: на мобільному закриває drawer. */
  onNavigate?: () => void;
  /** Кнопка закриття в самому меню: на мобільному воно лягає поверх шапки. */
  onClose?: () => void;
}

/**
 * Бічне меню адмінки.
 *
 * Коробку й пункти рендерить **спільний сайдбар** (`SideBar` із
 * `@wwwuabot/ui/nav`) — той самий, що панель розділів Простору й список
 * розділів теми: мірки пункту, згортання й «тут ти» описані там один раз
 * (`app-chrome.css`). Тут лишається рівно те, чим адмінка відрізняється від
 * платформи: лого, склад пунктів і кнопка виходу.
 *
 * Кнопку закриття теж рендерить **той самий сайдбар** (`onClose`) — вона видно
 * там, де меню лягає поверхнею (телефон), і має однаковий вигляд із панеллю
 * Простору; тут лишається передати їй дію.
 */
export function Sidebar({ open = false, onNavigate, onClose }: SidebarProps) {
  const collapsed = useCollapsedNav();
  const toggle = useSidebar((state) => state.toggle);

  async function handleLogout() {
    await logout();
    window.location.reload();
  }

  return (
    <SideBar
      className={`app-drawer${open ? " app-drawer--open" : ""}`}
      collapsed={collapsed}
      // Кнопка закриття видна лише там, де меню — поверхня (телефон): у потоці
      // його закриває тумблер у шапці самого меню, і друга кнопка під ту саму
      // дію читалась би як друга дія.
      onClose={onClose}
      header={
        <>
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

          {/* Кнопка теми — над пунктами меню, як і була: це шапка сайдбара, не
              низ. Тому вона в шапці, а не в «перед меню» — третього слота під
              одну кнопку не заводимо. */}
          <div className="wb-nav-extra">
            <ThemeButton compact={collapsed} />
          </div>
        </>
      }
      footer={
        <div className="wb-nav-footer">
          <button type="button" className="wb-app-logout" onClick={handleLogout} title="Вийти">
            <Icon name="logout" size={16} />
            {!collapsed && <span>Вийти</span>}
          </button>
        </div>
      }
    >
      <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />
    </SideBar>
  );
}
