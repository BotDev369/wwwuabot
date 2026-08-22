interface AppHeaderProps {
  onMenuClick: () => void;
  scenarioName?: string | null;
}

export function AppHeader({ onMenuClick, scenarioName }: AppHeaderProps) {
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
    </header>
  );
}
