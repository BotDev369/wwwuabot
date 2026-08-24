import React from 'react';

interface ContextualMenuItem {
  label: string;
  path: string;
}

interface ContextualSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  items: ContextualMenuItem[];
  title?: string;
}

export function ContextualSidebar({ isOpen, onClose, items, title = 'Дії' }: ContextualSidebarProps) {
  return (
    <>
      <div className={`backdrop ${isOpen ? 'show' : ''}`} onClick={onClose}></div>
      <aside className={`sidebar contextual ${isOpen ? '' : 'closed'}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#c0392b' }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#4a4a4a'
            }}
          >
            ×
          </button>
        </div>
        <nav>
          {items.map((item, index) => (
            <a
              key={index}
              href={item.path}
              onClick={onClose}
              className="contextual-menu-item"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
    </>
  );
}
