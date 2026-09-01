import { Link } from "react-router-dom";
import { useAppStore } from "@/stores/app.store";
import { StylePicker, ThemeToggle } from "@wwwuabot/shared";

const NAV_ITEMS = [
  { to: "/", label: "Головна", icon: "🏠" },
  { to: "/mydate/my-dates", label: "Мої дати", icon: "📅" },
  { to: "/mydate/compare", label: "Співставлення", icon: "🔄" },
  { to: "/mydate/about", label: "Про системи", icon: "ℹ️" },
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
        <nav>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Settings section — inside nav flow */}
        <div className="sidebar-settings">
          <div className="sidebar-settings-label">Налаштування</div>
          <StylePicker compact />
          <ThemeToggle compact />
        </div>
      </aside>
    </>
  );
}
