import { useAppStore } from "@/stores/app.store";

export function Header() {
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const scenarioName = useAppStore((s) => s.scenarioName);
  const showContextualMenu = useAppStore((s) => s.showContextualMenu);
  const setContextualSidebarOpen = useAppStore((s) => s.setContextualSidebarOpen);

  return (
    <header className="header">
      <button
        className="hamburger"
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label="Меню"
      >
        <span />
        <span />
        <span />
      </button>
      <span className="brand">WWWUABot</span>
      {scenarioName && <span className="header-sub scenario">{scenarioName}</span>}
      {showContextualMenu && (
        <button
          className="hamburger brand-color"
          onClick={() => setContextualSidebarOpen((v) => !v)}
          aria-label="Контекстне меню"
        >
          <span />
          <span />
          <span />
        </button>
      )}
    </header>
  );
}
