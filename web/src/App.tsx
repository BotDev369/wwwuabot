import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppHeader } from './components/layout/AppHeader';
import { AppFooter } from './components/layout/AppFooter';
import { AppSidebar } from './components/layout/AppSidebar';

// 🔶 БЛОК: ТИМЧАСОВА ДЕФОЛТНА СТОРІНКА — хардкод Base 1.0.
// TEMPORARY: пізніше — рендер блоків з конфігу API (GET /api/scenario/:slug).
function DefaultPage() {
  return (
    <main>
      <section className="hero">
        <h1>Вітаємо на веб-платформі WWWUABot!</h1>
        <a className="btn" href="/">Перейти на головну</a>
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
          <AppHeader onMenuClick={() => setSidebarOpen(v => !v)} />
          <Routes>
            <Route path="/*" element={<DefaultPage />} />
          </Routes>
          <AppFooter />
        </div>
      </div>
    </BrowserRouter>
  );
}
