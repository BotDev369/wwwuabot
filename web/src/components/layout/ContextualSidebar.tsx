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
  if (!isOpen) return null;

  return (
    <>
      <div className="backdrop show" onClick={onClose} style={{ zIndex: 999 }}></div>
      <aside
        className="sidebar contextual"
        style={{
          zIndex: 1000,
          right: 0,
          left: 'auto',
          boxShadow: '-2px 0 8px rgba(0,0,0,0.15)',
          transform: 'translateX(0)'
        }}
      >
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
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
    </>
  );
}
