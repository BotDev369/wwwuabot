import { Link } from 'react-router-dom';

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  return (
    <>
      <div className={`backdrop ${open ? 'show' : ''}`} onClick={onClose}></div>
      <aside className={`sidebar ${open ? '' : 'closed'}`}>
        <div className="sidebar-header">
          <button
            className="sidebar-close sidebar-close--left"
            onClick={onClose}
            aria-label="Закрити"
          >
            <span>×</span>
          </button>
        </div>
        <nav>
          <Link to="/" className="active">Головна</Link>
          <Link to="/buy-sell">Купити-продати</Link>
          <Link to="/self-dev">Саморозвиток</Link>
          <Link to="/fun">Розваги</Link>
          <Link to="/other">Інше</Link>
        </nav>
      </aside>
    </>
  );
}
