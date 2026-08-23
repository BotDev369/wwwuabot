import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppHeader } from './components/layout/AppHeader';
import { AppFooter } from './components/layout/AppFooter';
import { AppSidebar } from './components/layout/AppSidebar';
import { MydateResultPage } from './pages/MydateResultPage';

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
    const [yyyy, mm, dd] = value.split('-');
    window.location.href = `${basePath}/${dd}-${mm}-${yyyy}`;
  };

  return (
    <div style={{ marginTop: '16px' }}>
      <label style={{ display: 'block', marginBottom: '8px', color: '#4a4a4a', fontSize: '15px' }}>{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{ padding: '10px 14px', fontSize: '15px', borderRadius: '6px', border: '1px solid #ccc', marginRight: '12px' }}
      />
      <button className="btn" onClick={handleSubmit}>{buttonLabel}</button>
    </div>
  );
}

function DefaultPage({ onScenarioName }: { onScenarioName: (name: string | null) => void }) {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    const slug = window.location.pathname === '/' ? '__base__' : window.location.pathname.slice(1);
    fetch(`/api/scenario/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data?.config?.v === 1) {
          setConfig(data.config);
          onScenarioName(data.config.scenarioName ?? null);
        } else {
          setConfig(FALLBACK_CONFIG);
          onScenarioName(null);
        }
      })
      .catch(() => {
        setConfig(FALLBACK_CONFIG);
        onScenarioName(null);
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
              <p style={{ fontSize: '18px', lineHeight: '1.6', marginBottom: '24px', color: '#4a4a4a' }}>
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

  return (
    <BrowserRouter>
      <div className="layout">
        <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="content">
          <AppHeader onMenuClick={() => setSidebarOpen(v => !v)} scenarioName={scenarioName} />
          <Routes>
            <Route path="/mydate/:date" element={<MydateResultPage onScenarioName={setScenarioName} />} />
            <Route path="/*" element={<DefaultPage onScenarioName={setScenarioName} />} />
          </Routes>
          <AppFooter />
        </div>
      </div>
    </BrowserRouter>
  );
}
