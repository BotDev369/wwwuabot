import { useEffect, useState, type ReactNode } from 'react';

const TELEGRAM_BOT = 'botdev_test_001_bot';

/**
 * Зчитує user_id з Telegram WebApp SDK або URL params.
 * Робить кілька спроб оскільки SDK може завантажитись пізніше.
 */
function readUserId(): number | null {
  // 1. Telegram WebApp SDK
  const tg = (window as any).Telegram?.WebApp;
  if (tg?.initDataUnsafe?.user?.id) {
    return tg.initDataUnsafe.user.id;
  }
  // 2. URL params (?user_id=XXX) — бот повертає сюди з user_id
  const params = new URLSearchParams(window.location.search);
  const uid = params.get('user_id');
  if (uid) {
    const id = parseInt(uid, 10);
    if (!isNaN(id)) return id;
  }
  return null;
}

/**
 * Зберігає user_id в localStorage для наступних відвідувань.
 */
function cacheUserId(id: number) {
  try { localStorage.setItem('tg_user_id', String(id)); } catch {}
}

function getCachedUserId(): number | null {
  try {
    const raw = localStorage.getItem('tg_user_id');
    if (raw) return parseInt(raw, 10);
  } catch {}
  return null;
}

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const [userId, setUserId] = useState<number | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // 1. Спробувати прочитати одразу
    let id = readUserId();

    // 2. Якщо є кешований — використати
    if (!id) id = getCachedUserId();

    if (id) {
      cacheUserId(id);
      setUserId(id);
      setChecking(false);
      return;
    }

    // 3. Retry: SDK може завантажитись пізніше (до 3 сек)
    let attempts = 0;
    const maxAttempts = 15;
    const interval = setInterval(() => {
      attempts++;
      const found = readUserId();
      if (found) {
        cacheUserId(found);
        setUserId(found);
        setChecking(false);
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        setChecking(false);
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // Показуємо завантаження поки перевіряємо
  if (checking) {
    return (
      <main>
        <section className="hero">
          <p className="status-text">Перевірка авторизації...</p>
        </section>
      </main>
    );
  }

  // Не авторизований — показуємо кнопку
  if (!userId) {
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

  // Авторизований — показуємо контент
  return <>{children}</>;
}
