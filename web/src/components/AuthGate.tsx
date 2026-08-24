import { useState, useEffect, type ReactNode } from 'react';

const TELEGRAM_BOT = 'botdev_test_001_bot';

function isTelegramWebApp(): boolean {
  return !!(window as any).Telegram?.WebApp;
}

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const [inTelegram, setInTelegram] = useState<boolean | null>(null);

  useEffect(() => {
    // Даємо SDK час завантажитись
    const timer = setTimeout(() => {
      setInTelegram(isTelegramWebApp());
    }, 300);
    return () => clearTimeout(timer);
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

  // В браузері — направляємо в Telegram
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

  // В Telegram WebApp — авторизовано
  return <>{children}</>;
}
