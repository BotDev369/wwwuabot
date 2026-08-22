interface AppHeaderProps {
  onMenuClick: () => void;
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  return (
    <header className="header">
      <button className="hamburger" onClick={onMenuClick} aria-label="Меню">
        <span></span>
        <span></span>
        <span></span>
      </button>
      <span className="brand">WWWUABot</span>
      <span className="header-sub">Web Platform</span>
    </header>
  );
}
