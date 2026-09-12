import { NavLink } from "react-router-dom";
import { useAdminNav } from "./adminNav.store";
import { icons } from "@wwwuabot/shared";

interface SidebarNavProps {
  collapsed: boolean;
  /** Клік по пункту меню: на мобільному закриває drawer. */
  onNavigate?: () => void;
}

export function SidebarNav({ collapsed, onNavigate }: SidebarNavProps) {
  const sections = useAdminNav((state) => state.sections);

  return (
    <nav className="sidebar-nav">
      {sections.map((section, sIdx) => (
        <div className="sidebar-section" key={section.title ?? `section-${sIdx}`}>
          {section.title && !collapsed && (
            <div className="sidebar-section-title">{section.title}</div>
          )}
          {section.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              title={collapsed ? item.label : undefined}
              onClick={onNavigate}
              className={({ isActive }) =>
                `sidebar-nav-item${isActive ? " sidebar-nav-item--active" : ""}`
              }
            >
              <span className="sidebar-nav-icon">{icons[item.icon]}</span>
              {!collapsed && <span className="sidebar-nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}
