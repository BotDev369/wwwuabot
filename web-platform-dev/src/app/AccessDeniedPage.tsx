/**
 * Сторінка «за запрошенням» — те, що бачить людина без допуску.
 *
 * **Чому це сторінка, а не порожній екран.** Закритий продукт має сказати
 * чому: без пояснення людина лишається з відчуттям, що платформа зламана.
 * Тут рівно два факти — закритий доступ і хто його відкриває, — і одна дія:
 * перейти в Telegram.
 *
 * **Каркас — спільний `.wb-auth*`, як у `LoginScreen` адмінки.** Оболонки
 * однакові за виглядом (AGENTS.md §3), тому приватний CSS на цю сторінку не
 * потрібен і не з'явиться.
 *
 * @module web-platform-dev/src/app/AccessDeniedPage
 */

import { Icon } from "@wwwuabot/shared";

const BOT_USERNAME = "botdev_test_001_bot";

interface AccessDeniedPageProps {
  /** Перший рядок: що саме закрите. */
  subject: string;
  /** Другий рядок: хто відкриває доступ. */
  hint: string;
}

/** Екран відмови: лого, два рядки й кнопка в Telegram. */
export function AccessDeniedPage({ subject, hint }: AccessDeniedPageProps) {
  return (
    <div className="wb-auth">
      <div className="wb-auth-card">
        <div className="wb-auth-logo">
          <span className="wb-auth-logo-icon">✦</span>
          <span className="wb-auth-logo-text">WWWUABOT</span>
        </div>
        <p className="wb-auth-message">{subject}</p>
        <p className="wb-auth-message">{hint}</p>
        <a href={`https://t.me/${BOT_USERNAME}`} className="wb-btn wb-btn-telegram wb-auth-submit">
          <Icon name="external-link" size={16} />
          Відкрити в Telegram
        </a>
      </div>
    </div>
  );
}
