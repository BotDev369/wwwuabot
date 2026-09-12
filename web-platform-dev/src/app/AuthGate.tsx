import { type ReactNode, useState, useEffect } from "react";
import { Icon } from "@wwwuabot/shared";

const BOT_USERNAME = "botdev_test_001_bot";

interface AuthGateProps {
  children: ReactNode;
}

/**
 * Чи є підписаний `initData` від Telegram.
 *
 * Перевіряємо саме `initData` (підписаний рядок), а не `initDataUnsafe.user`:
 * api-dev довіряє виключно підпису, тож клієнтський гейт має перевіряти те
 * саме, що й сервер. Поза Telegram SDK лишає об'єкт порожнім.
 */
function hasTelegramSession(): boolean {
  try {
    return !!window.Telegram?.WebApp?.initData;
  } catch {
    return false;
  }
}

export function AuthGate({ children }: AuthGateProps) {
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthorized(hasTelegramSession());
  }, []);

  if (authorized === null) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4 p-6 text-center">
        <p>Завантаження...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex items-center justify-center h-screen flex-col gap-4 p-6 text-center">
        <h2>WWWUABot</h2>
        <p className="text-secondary">Відкрийте веб-платформу через Telegram бот.</p>
        <a href={`https://t.me/${BOT_USERNAME}`} className="wb-btn wb-btn-telegram">
          <Icon name="external-link" size={16} />
          Відкрити в Telegram
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
