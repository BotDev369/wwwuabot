import { NavLink } from "react-router-dom";
import { useAppStore } from "@/stores/app.store";
import { ThemeButton, icons } from "@wwwuabot/shared";
import type { IconName } from "@wwwuabot/shared";

const NAV_ITEMS: { to: string; label: string; icon: IconName }[] = [
  { to: "/", label: "Головна", icon: "home" },
  { to: "/mydate/my-dates", label: "Мої дати", icon: "my-dates" },
  { to: "/mydate/compare", label: "Співставлення", icon: "compare" },
  { to: "/mydate/about", label: "Про системи", icon: "info" },
  { to: "/profile", label: "Профіль", icon: "users" },
];

export function Sidebar() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);

  return (
    <>
      <div
        className={`backdrop ${sidebarOpen ? "show" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={`sidebar ${sidebarOpen ? "" : "closed"}`}>
        <div className="sidebar-header">
          <button
            className="sidebar-close sidebar-close--left"
            onClick={() => setSidebarOpen(false)}
            aria-label="Закрити"
          >
            <span>×</span>
          </button>
        </div>

        {/* Theme button — top of nav, above Головна */}
        <div style={{ padding: "8px 8px 0" }}>
          <ThemeButton compact />
        </div>

        <nav>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `sidebar-nav-item${isActive ? " sidebar-nav-item--active" : ""}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sidebar-nav-icon">
                {icons[item.icon]}
              </span>
              <span className="sidebar-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
