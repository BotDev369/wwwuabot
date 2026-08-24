import { useEffect, useState, type ReactNode } from 'react';

const TELEGRAM_BOT = 'botdev_test_001_bot';

function getTelegramUserId(): number | null {
  const tg = (window as any).Telegram?.WebApp;
  if (!tg) return null;

  // Спосіб 1: initDataUnsafe (працює з reply keyboard web_app кнопок)
  if (tg.initDataUnsafe?.user?.id) {
    return tg.initDataUnsafe.user.id;
  }

  // Спосіб 2: парсимо initData string
  if (tg.initData) {
    try {
      const params = new URLSearchParams(tg.initData);
      const userStr = params.get('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user?.id) return user.id;
      }
    } catch {}
  }

  return null;
}

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      // Викликаємо ready() — обов'язково для ініціалізації SDK
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        try { tg.ready(); } catch {}
      }

      // Чекаємо SDK (до 3 сек)
      let userId: number | null = null;
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 200));
        userId = getTelegramUserId();
        if (userId) break;
      }

      if (cancelled) return;

      if (!userId) {
        setAuthorized(false);
        return;
      }

      // Перевіряємо в БД
      try {
        const res = await fetch(`/api/auth/check?user_id=${userId}`);
        const data = await res.json();
        if (!cancelled) setAuthorized(data.exists === true);
      } catch {
        if (!cancelled) setAuthorized(false);
      }
    }

    check();
    return () => { cancelled = true; };
  }, []);

  // Завантаження
  if (authorized === null) {
    return (
      <main>
        <section className="hero">
          <p className="status-text">...</p>
        </section>
      </main>
    );
  }

  // Не авторизований
  if (!authorized) {
    const currentPath = window.location.pathname;
    const slug = currentPath === '/' ? 'main' : currentPath.replace(/^\//, '');
    const botLink = `https://t.me/${TELEGRAM_BOT}?start=${encodeURIComponent(slug)}`;
    const isTelegram = !!(window as any).Telegram?.WebApp;

    return (
      <main>
        <section className="hero">
          <h1>WWWUABot</h1>
          {isTelegram ? (
            // Відкрито в Telegram, але SDK не повернув user_id
            // Можливо inline keyboard кнопка — потрібен restart
            <>
              <p className="hero-text">
                Авторизацію не вдалося визначити. Спробуйте оновити сторінку.
              </p>
              <button
                className="btn btn-telegram"
                onClick={() => window.location.reload()}
              >
                🔄 Оновити
              </button>
            </>
          ) : (
            // Відкрито в браузері — направляємо в Telegram
            <>
              <p className="hero-text">
                Відкрийте веб-платформу через Telegram бот.
              </p>
              <a
                className="btn btn-telegram"
                href={botLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                ✈ Відкрити в Telegram
              </a>
            </>
          )}
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
