import { useState, useEffect, type ReactNode } from 'react';

const TELEGRAM_BOT = 'botdev_test_001_bot';

function hasTelegramSDK(): boolean {
  return !!(window as any).Telegram?.WebApp;
}

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const [inTelegram, setInTelegram] = useState<boolean | null>(null);

  useEffect(() => {
    // Спочатку перевіряємо одразу
    if (hasTelegramSDK()) {
      setInTelegram(true);
      return;
    }

    // SDK може завантажитись пізніше — чекаємо до 5 сек
    let attempts = 0;
    const maxAttempts = 25;
    const interval = setInterval(() => {
      attempts++;
      if (hasTelegramSDK()) {
        setInTelegram(true);
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        setInTelegram(false);
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // Завантаження
  if (inTelegram === null) {
    return (
      <main>
        <section className="hero">
          <p className="status-text">...</p>
        </section>
      </main>
    );
  }

  // В браузері
  if (!inTelegram) {
    const currentPath = window.location.pathname;
    const slug = currentPath === '/' ? 'main' : currentPath.replace(/^\//, '');
    const botLink = `https://t.me/${TELEGRAM_BOT}?start=${encodeURIComponent(slug)}`;

    return (
      <main>
        <section className="hero">
          <h1>WWWUABot</h1>
          <p className="hero-text">
            Відкрийте веб-платформу через Telegram бот.
          </p>
          <a className="btn btn-telegram" href={botLink} target="_blank" rel="noopener noreferrer">
            ✈ Відкрити в Telegram
          </a>
        </section>
      </main>
    );
  }

  // В Telegram WebApp
  return <>{children}</>;
}
