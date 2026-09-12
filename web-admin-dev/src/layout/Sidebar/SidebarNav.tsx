import { NavLink } from "react-router-dom";
import { icons } from "@wwwuabot/shared";
import { useAdminNav } from "./adminNav.store";

interface SidebarNavProps {
  collapsed: boolean;
  /** Клік по пункту меню: на мобільному закриває drawer. */
  onNavigate?: () => void;
}

export function SidebarNav({ collapsed, onNavigate }: SidebarNavProps) {
  const sections = useAdminNav((state) => state.sections);

  return (
    <nav className="wb-nav-menu">
      {sections.map((section, sIdx) => (
        <div className="wb-nav-section" key={section.title ?? `section-${sIdx}`}>
          {section.title && !collapsed && (
            <div className="wb-nav-section-title">{section.title}</div>
          )}
          {section.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              title={collapsed ? item.label : undefined}
              onClick={onNavigate}
              className={({ isActive }) => `wb-nav-item${isActive ? " wb-nav-item--active" : ""}`}
            >
              <span className="wb-nav-icon">{icons[item.icon]}</span>
              {!collapsed && <span className="wb-nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}
