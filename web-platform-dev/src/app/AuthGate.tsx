import { type ReactNode } from "react";
import { Icon } from "@wwwuabot/shared";
import { useAccess } from "./useAccess";

const BOT_USERNAME = "botdev_test_001_bot";

interface AuthGateProps {
  children: ReactNode;
}

/**
 * Екран відмови — один кирпичик `.wb-auth*` на обидва випадки: «відкрий у
 * Telegram» (немає підписаного `initData`) і «запрошені тут» (вхід у платформу
 * без запрошення). Різниця лише в словах, тож це той самий каркас, а не два
 * екрани.
 */
function AccessScreen({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="wb-auth">
      <div className="wb-auth-card">
        <div className="wb-auth-logo">
          <span className="wb-auth-logo-icon">✦</span>
          <span className="wb-auth-logo-text">WWWUABOT</span>
        </div>
        <p className="wb-auth-message">{message}</p>
        <p className="wb-auth-message">{hint}</p>
        <a href={`https://t.me/${BOT_USERNAME}`} className="wb-btn wb-btn-telegram wb-auth-submit">
          <Icon name="external-link" size={16} />
          Відкрити в Telegram
        </a>
      </div>
    </div>
  );
}

/**
 * Гейт TWA: підпис Telegram **і** допуск за запрошенням.
 *
 * Два питання, два екрани, але обидва «ні» означають одне — продукт закритий.
 * `useAccess` робить запит до `/api/user/access` (єдиний шлях поза гейтом
 * допуску) і чекає на нього: показувати платформу до відповіді означало б
 * віддати людині екрани з помилками замість пояснення.
 *
 * Помилка запиту — те саме «ні»: показати продукт, який не вдалося перевірити,
 * означало б відкрити його.
 */
export function AuthGate({ children }: AuthGateProps) {
  const { allowed, ready } = useAccess();

  if (!ready) return <div className="wb-auth" />;

  if (!allowed) {
    return (
      <AccessScreen
        message="Платформа — за запрошеннями."
        hint="Попросіть людину, яка вже тут, надіслати вам посилання — і воно відкриється."
      />
    );
  }

  return <>{children}</>;
}
