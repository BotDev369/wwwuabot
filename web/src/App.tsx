import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppHeader } from './components/layout/AppHeader';
import { AppFooter } from './components/layout/AppFooter';
import { AppSidebar } from './components/layout/AppSidebar';

//  БЛОК: FALLBACK-ХАРКОД Base 1.0 — каскад G4: якщо API недоступний, сторінка все одно працює.
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

function DefaultPage() {
  const [config, setConfig] = useState<any>(null);
  const [scenarioName, setScenarioName] = useState<string | null>(null);

  useEffect(() => {
    const slug = window.location.pathname === '/' ? '__base__' : window.location.pathname.slice(1);
    fetch(`/api/scenario/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data?.config?.v === 1) {
          setConfig(data.config);
          setScenarioName(data.config.scenarioName ?? null);
        } else {
          setConfig(FALLBACK_CONFIG);
        }
      })
      .catch(() => setConfig(FALLBACK_CONFIG));
  }, []);

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

  return (
    <BrowserRouter>
      <div className="layout">
        <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="content">
          <AppHeader onMenuClick={() => setSidebarOpen(v => !v)} scenarioName={scenarioName} />
          <Routes>
            <Route path="/*" element={<DefaultPage />} />
          </Routes>
          <AppFooter />
        </div>
      </div>
    </BrowserRouter>
  );
}
