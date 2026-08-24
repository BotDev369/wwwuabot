import { useEffect, useState, type ReactNode } from 'react';

const TELEGRAM_BOT = 'botdev_test_001_bot';

/**
 * Зчитує user_id з Telegram WebApp SDK.
 * Крок 1: ready() → крок 2: initDataUnsafe → крок 3: парсимо initData string.
 */
function getTelegramUserId(): number | null {
  const tg = (window as any).Telegram?.WebApp;
  if (!tg) return null;

  // Спосіб 1: initDataUnsafe.user.id (найпростіший)
  if (tg.initDataUnsafe?.user?.id) {
    return tg.initDataUnsafe.user.id;
  }

  // Спосіб 2: парсимо initData (URL-encoded query string)
  // Формат: user=%7B%22id%22%3A123456%7D&chat_instance=...
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
      const tg = (window as any).Telegram?.WebApp;

      // Обов'язково викликаємо ready() — без цього SDK може не працювати
      if (tg) {
        try { tg.ready(); } catch {}
      }

      // Даємо SDK час ініціалізуватися
      await new Promise(r => setTimeout(r, 300));

      let userId = getTelegramUserId();

      // Якщо SDK ще не готовий — retry до 3 сек
      if (!userId) {
        for (let i = 0; i < 14; i++) {
          await new Promise(r => setTimeout(r, 200));
          userId = getTelegramUserId();
          if (userId) break;
        }
      }

      if (cancelled) return;

      if (!userId) {
        // SDK не знайдений — користувач поза Telegram (браузер)
        console.log('[AuthGate] No Telegram SDK found — showing auth button');
        setAuthorized(false);
        return;
      }

      console.log('[AuthGate] User ID found:', userId);

      // SDK знайдений — перевіряємо на бекенді чи є юзер в базі
      try {
        const res = await fetch(`/api/auth/check?user_id=${userId}`);
        const data = await res.json();
        console.log('[AuthGate] Auth check result:', data);
        if (!cancelled) {
          setAuthorized(data.exists === true);
        }
      } catch (err) {
        console.error('[AuthGate] Auth check failed:', err);
        if (!cancelled) {
          setAuthorized(false);
        }
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
          <p className="status-text">Перевірка авторизації...</p>
        </section>
      </main>
    );
  }

  // Не авторизований
  if (!authorized) {
    const currentPath = window.location.pathname;
    const slug = currentPath === '/' ? 'main' : currentPath.replace(/^\//, '');
    const botLink = `https://t.me/${TELEGRAM_BOT}?start=${encodeURIComponent(slug)}`;

    return (
      <main>
        <section className="hero">
          <h1>WWWUABot</h1>
          <p className="hero-text">
            Для доступу до веб-платформи авторизуйтесь через Telegram бот.
          </p>
          <a
            className="btn btn-telegram"
            href={botLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              const tg = (window as any).Telegram?.WebApp;
              if (tg?.close) {
                tg.close();
              } else {
                window.location.href = botLink;
              }
            }}
          >
            ✈ Authorize via Telegram
          </a>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
