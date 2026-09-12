import { type ReactNode } from "react";
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

/**
 * Гейт TWA.
 *
 * Сам екран — спільні кирпичики `.wb-auth*` (ті самі, що в `LoginScreen`
 * адмінки): однаковий вигляд, різна логіка. Перевірка синхронна й без стану:
 * `initData` доступний одразу після завантаження SDK, тож проміжного екрана
 * «Завантаження...» не потрібно.
 */
export function AuthGate({ children }: AuthGateProps) {
  if (!hasTelegramSession()) {
    return (
      <div className="wb-auth">
        <div className="wb-auth-card">
          <div className="wb-auth-logo">
            <span className="wb-auth-logo-icon">✦</span>
            <span className="wb-auth-logo-text">WWWUABOT</span>
          </div>
          <p className="wb-auth-message">Відкрийте веб-платформу через Telegram бот.</p>
          <a
            href={`https://t.me/${BOT_USERNAME}`}
            className="wb-btn wb-btn-telegram wb-auth-submit"
          >
            <Icon name="external-link" size={16} />
            Відкрити в Telegram
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
