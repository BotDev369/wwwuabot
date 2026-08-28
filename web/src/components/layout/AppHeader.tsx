import { ThemeToggle } from "@wwwuabot/shared";

interface AppHeaderProps {
  onMenuClick: () => void;
  scenarioName?: string | null;
  showContextualMenu?: boolean;
  onContextualMenuClick?: () => void;
}

export function AppHeader({
  onMenuClick,
  scenarioName,
  showContextualMenu,
  onContextualMenuClick,
}: AppHeaderProps) {
  return (
    <header className="header">
      <button className="hamburger" onClick={onMenuClick} aria-label="Меню">
        <span></span>
        <span></span>
        <span></span>
      </button>
      <span className="brand">WWWUABot</span>
      {scenarioName && <span className="header-sub scenario">{scenarioName}</span>}
      <ThemeToggle compact />
      {showContextualMenu && (
        <button
          className="hamburger brand-color"
          onClick={onContextualMenuClick}
          aria-label="Контекстне меню"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      )}
    </header>
  );
}
