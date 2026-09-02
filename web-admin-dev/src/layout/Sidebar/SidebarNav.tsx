import { NavLink } from "react-router-dom";
import { navSections } from "./navItems";
import { useSidebar } from "./useSidebar";
import { icons } from "@wwwuabot/shared";

export function SidebarNav() {
  const collapsed = useSidebar((s) => s.collapsed);

  return (
    <nav className="sidebar-nav">
      {navSections.map((section, sIdx) => (
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
              className={({ isActive }) =>
                `sidebar-nav-item${isActive ? " sidebar-nav-item--active" : ""}`
              }
            >
              <span className="sidebar-nav-icon">
                {icons[item.icon]}
              </span>
              {!collapsed && <span className="sidebar-nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}
