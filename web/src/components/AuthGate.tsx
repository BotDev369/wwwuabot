import { useEffect, useState, type ReactNode } from 'react';

const TELEGRAM_BOT = 'botdev_test_001_bot';

/**
 * Отримує user_id з Telegram WebApp.
 * initData доступний завжди (навіть з inline keyboard web_app кнопок).
 * initDataUnsafe.user НЕ доступний з inline keyboard — тільки з reply keyboard.
 */
function getTelegramUserId(): number | null {
  const tg = (window as any).Telegram?.WebApp;
  if (!tg) return null;

  // Спосіб 1: initDataUnsafe (reply keyboard)
  if (tg.initDataUnsafe?.user?.id) {
    return tg.initDataUnsafe.user.id;
  }

  // Спосіб 2: парсимо initData (доступний завжди навіть з inline keyboard)
  // Формат: user=%7B%22id%22%3A123456%7D&chat_instance=...&hash=...
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
      // Викликаємо ready()
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        try { tg.ready(); } catch {}
      }

      // Даємо SDK час ініціалізуватися
      await new Promise(r => setTimeout(r, 500));

      let userId = getTelegramUserId();

      // Retry до 3 сек
      if (!userId) {
        for (let i = 0; i < 12; i++) {
          await new Promise(r => setTimeout(r, 200));
          userId = getTelegramUserId();
          if (userId) break;
        }
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

  if (authorized === null) {
    return (
      <main>
        <section className="hero">
          <p className="status-text">...</p>
        </section>
      </main>
    );
  }

  if (!authorized) {
    const currentPath = window.location.pathname;
    const slug = currentPath === '/' ? 'main' : currentPath.replace(/^\//, '');
    const botLink = `https://t.me/${TELEGRAM_BOT}?start=${encodeURIComponent(slug)}`;
    const isTelegram = !!(window as any).Telegram?.WebApp;

    return (
      <main>
        <section className="hero">
          <h1>WWWUABot</h1>
          <p className="hero-text">
            {isTelegram
              ? 'Авторизацію не вдалося визначити. Оновіть сторінку.'
              : 'Відкрийте веб-платформу через Telegram бот.'}
          </p>
          {isTelegram ? (
            <button className="btn btn-telegram" onClick={() => window.location.reload()}>
              🔄 Оновити
            </button>
          ) : (
            <a className="btn btn-telegram" href={botLink} target="_blank" rel="noopener noreferrer">
              ✈ Відкрити в Telegram
            </a>
          )}
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
