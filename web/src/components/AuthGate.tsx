import { useEffect, useState, type ReactNode } from 'react';

const TELEGRAM_BOT = 'botdev_test_001_bot';

/**
 * Зчитує user_id ТІЛЬКИ з Telegram WebApp SDK.
 * SDK підписує дані криптографічно — це безпечно.
 */
function getTelegramUserId(): number | null {
  const tg = (window as any).Telegram?.WebApp;
  if (tg?.initDataUnsafe?.user?.id) {
    return tg.initDataUnsafe.user.id;
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
      // Спочатку пробуємо одразу
      let userId = getTelegramUserId();

      // Якщо SDK ще не завантажився — чекаємо (до 3 сек)
      if (!userId) {
        for (let i = 0; i < 15; i++) {
          await new Promise(r => setTimeout(r, 200));
          userId = getTelegramUserId();
          if (userId) break;
        }
      }

      if (cancelled) return;

      if (!userId) {
        // SDK не знайдений — користувач поза Telegram (браузер)
        setAuthorized(false);
        return;
      }

      // SDK знайдений — перевіряємо на бекенді чи є юзер в базі
      try {
        const res = await fetch(`/api/auth/check?user_id=${userId}`);
        const data = await res.json();
        if (!cancelled) {
          setAuthorized(data.exists === true);
        }
      } catch {
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
          <p className="status-text">...</p>
        </section>
      </main>
    );
  }

  // Не авторизований
  if (!authorized) {
    // Визначаємо slug поточної сторінки для повернення
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
              // Закриваємо WebApp щоб побачити бота
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

  // Авторизований — показуємо контент
  return <>{children}</>;
}
