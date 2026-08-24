interface ContextualMenuItem {
  label: string;
  path: string;
}

interface ContextualSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  items: ContextualMenuItem[];
}

export function ContextualSidebar({ isOpen, onClose, items }: ContextualSidebarProps) {
  return (
    <>
      <div className={`backdrop ${isOpen ? 'show' : ''}`} onClick={onClose}></div>
      <aside className={`sidebar contextual ${isOpen ? '' : 'closed'}`}>
        <div className="sidebar-header">
          <button
            className="sidebar-close sidebar-close--right"
            onClick={onClose}
            aria-label="Закрити"
          >
            <span>×</span>
          </button>
        </div>
        <nav>
          <a href="/wwwuabot/mydate" className="active" onClick={onClose}>Головна</a>
          {items.map((item) => (
            <a key={item.path} href={item.path} onClick={onClose}>
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
    </>
  );
}
