import { Link } from "react-router-dom";
import { useAppStore } from "@/stores/app.store";

const CONTEXTUAL_ITEMS = [
  { label: "Мої дати", path: "/mydate/my-dates" },
  { label: "Співставлення дат", path: "/mydate/compare" },
  { label: "Про системи аналізу", path: "/mydate/about" },
];

export function ContextualSidebar() {
  const isOpen = useAppStore((s) => s.contextualSidebarOpen);
  const onClose = useAppStore((s) => s.setContextualSidebarOpen);

  return (
    <>
      <div
        className={`backdrop ${isOpen ? "show" : ""}`}
        onClick={() => onClose(false)}
      />
      <aside className={`sidebar contextual ${isOpen ? "" : "closed"}`}>
        <div className="sidebar-header">
          <button
            className="sidebar-close sidebar-close--right"
            onClick={() => onClose(false)}
            aria-label="Закрити"
          >
            <span>×</span>
          </button>
        </div>
        <nav>
          <Link to="/mydate" onClick={() => onClose(false)}>
            Головна
          </Link>
          {CONTEXTUAL_ITEMS.map((item) => (
            <Link key={item.path} to={item.path} onClick={() => onClose(false)}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
