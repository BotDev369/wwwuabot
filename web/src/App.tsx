import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppHeader } from './components/layout/AppHeader';
import { AppFooter } from './components/layout/AppFooter';
import { AppSidebar } from './components/layout/AppSidebar';
import { ContextualSidebar } from './components/layout/ContextualSidebar';
import { AuthGate } from './components/AuthGate';
import { MydatePage } from './pages/MydateResultPage';
import { MyDatesPage } from './pages/MyDatesPage';
import { CompareSetupPage } from './pages/CompareSetupPage';
import { CompareSystemsPage } from './pages/CompareSystemsPage';

const FALLBACK_CONFIG = {
  v: 1,
  meta: { title: 'WWWUABot — Головна' },
  slots: {
    main: [
      { component: 'Heading', props: { text: 'Вітаємо на веб-платформі WWWUABot!' } },
      { component: 'Button', props: { label: 'Перейти на головну', href: '/' } },
    ],
  },
};

function DateInputBlock({ label, buttonLabel, basePath }: { label: string; buttonLabel: string; basePath: string }) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (!value) return;
    window.location.href = `${basePath}/${value}`;
  };

  return (
    <div className="date-input-block">
      <label className="date-input-label">{label}</label>
      <div className="date-input-row">
        <input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="date-input"
        />
        <button className="btn btn-inline" onClick={handleSubmit}>{buttonLabel}</button>
      </div>
    </div>
  );
}

function DefaultPage({ onScenarioName }: { onScenarioName: (name: string | null, forceContextual?: boolean) => void }) {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    const slug = window.location.pathname === '/' ? '__base__' : window.location.pathname.slice(1);
    fetch(`/api/scenario/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data?.config?.v === 1) {
          setConfig(data.config);
          onScenarioName(data.config.scenarioName ?? null, false);
        } else {
          setConfig(FALLBACK_CONFIG);
          onScenarioName(null, false);
        }
      })
      .catch(() => {
        setConfig(FALLBACK_CONFIG);
        onScenarioName(null, false);
      });
  }, [onScenarioName]);

  const cfg = config ?? FALLBACK_CONFIG;

  return (
    <main>
      <section className="hero">
        {cfg.slots.main.map((block: any, i: number) => (
          <div key={i}>
            {block.component === 'Heading' && <h1>{block.props.text}</h1>}
            {block.component === 'Paragraph' && (
              <p className="hero-text">
                {block.props.text}
              </p>
            )}
            {block.component === 'Button' && (
              <a className="btn" href={block.props.href}>{block.props.label}</a>
            )}
            {block.component === 'DateInput' && (
              <DateInputBlock label={block.props.label} buttonLabel={block.props.buttonLabel} basePath={block.props.basePath} />
            )}
          </div>
        ))}
      </section>
    </main>
  );
}

export function App() {
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.matchMedia('(min-width: 769px)').matches
  );
  const [scenarioName, setScenarioName] = useState<string | null>(null);
  const [showContextualMenu, setShowContextualMenu] = useState(false);
  const [contextualSidebarOpen, setContextualSidebarOpen] = useState(false);

  const handleScenarioName = (name: string | null, forceContextual: boolean = false) => {
    setScenarioName(name);
    const shouldShowContextual = forceContextual || name === 'MyDate';
    setShowContextualMenu(shouldShowContextual);
  };

  const contextualMenuItems = [
    { label: 'Мої дати', path: '/mydate/my-dates' },
    { label: 'Співставлення дат', path: '/mydate/compare' },
    { label: 'Про системи аналізу', path: '/mydate/about' }
  ];

  return (
    <BrowserRouter>
      <AuthGate>
        <div className="layout">
          <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <ContextualSidebar 
            isOpen={contextualSidebarOpen} 
            onClose={() => setContextualSidebarOpen(false)} 
            items={contextualMenuItems}
          />
          <div className="content">
            <AppHeader 
              onMenuClick={() => setSidebarOpen(v => !v)} 
              scenarioName={scenarioName}
              showContextualMenu={showContextualMenu}
              onContextualMenuClick={() => setContextualSidebarOpen(v => !v)}
            />
            <Routes>
              <Route path="/mydate/compare/systems" element={<CompareSystemsPage onScenarioName={(name) => handleScenarioName(name, true)} />} />
              <Route path="/mydate/compare" element={<CompareSetupPage onScenarioName={(name) => handleScenarioName(name, true)} />} />
              <Route path="/mydate/my-dates" element={<MyDatesPage onScenarioName={(name) => handleScenarioName(name, true)} />} />
              <Route path="/mydate/:date" element={<MydatePage onScenarioName={(name) => handleScenarioName(name, true)} />} />
              <Route path="/*" element={<DefaultPage onScenarioName={handleScenarioName} />} />
            </Routes>
            <AppFooter />
          </div>
        </div>
      </AuthGate>
    </BrowserRouter>
  );
}
