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
      {scenarioName && (
        <span className="header-sub" style={{ color: '#c0392b', fontWeight: 600 }}>
          {scenarioName}
        </span>
      )}
      {showContextualMenu && (
        <button 
          className="hamburger" 
          onClick={onContextualMenuClick} 
          aria-label="Контекстне меню"
          style={{ marginLeft: '8px' }}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      )}
    </header>
  );
}
