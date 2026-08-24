interface AppHeaderProps {
  onMenuClick: () => void;
  scenarioName?: string | null;
  showContextualMenu?: boolean;
  onContextualMenuClick?: () => void;
}

export function AppHeader({ onMenuClick, scenarioName, showContextualMenu, onContextualMenuClick }: AppHeaderProps) {
  return (
    <header className="header">
      <button className="hamburger" onClick={onMenuClick} aria-label="Меню">
        <span></span>
        <span></span>
        <span></span>
      </button>
      <span className="brand">WWWUABot</span>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {scenarioName && (
          <span className="header-sub" style={{ color: '#c0392b', fontWeight: 600, fontSize: '16px' }}>
            {scenarioName}
          </span>
        )}
        {showContextualMenu && (
          <button 
            className="hamburger contextual-hamburger" 
            onClick={onContextualMenuClick} 
            aria-label="Контекстне меню"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        )}
      </div>
    </header>
  );
}
