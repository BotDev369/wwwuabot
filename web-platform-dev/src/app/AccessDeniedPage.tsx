/**
 * Сторінка «за запрошенням» — те, що бачить людина без допуску.
 *
 * **Чому це сторінка, а не порожній екран.** Закритий продукт має сказати
 * чому: без пояснення людина лишається з відчуттям, що платформа зламана.
 * Тут рівно два факти — закритий доступ і хто його відкриває, — і дві дії,
 * бо одна не покриває два різні випадки.
 *
 * **Дві кнопки, бо це два випадки.** «Написати в Telegram» — людині треба
 * сказати, чому її не запросили; текст ми підставляємо заздалегідь
 * (`?text=`), бо з порожнім полем вона не знає, що написати. «Спробувати
 * ще раз» — її могли запросити щойно, поки вона дивилась на цей екран, тож
 * запит про допуск треба повторити, а не просити перезавантажити застосунок.
 *
 * **Каркас — спільний `.wb-auth*` і `.wb-btn*`, як у `LoginScreen` адмінки.**
 * Оболонки однакові за виглядом (AGENTS.md §3), тому приватний CSS на цю
 * сторінку не потрібен і не з'явиться.
 *
 * @module web-platform-dev/src/app/AccessDeniedPage
 */

import { Icon } from "@wwwuabot/shared";

const BOT_USERNAME = "botdev_test_001_bot";

/**
 * Текст, який людині не треба думати.
 *
 * Короткий і без прохання «напишіть нам» — Telegram підставить його в поле
 * введення, тож від неї лишається лише натиснути «Надіслати».
 */
const ASK_TEXT = "Вітаю! Хочу скористатися платформою wwwuabot — запросіть мене, будь ласка.";

interface AccessDeniedPageProps {
  /** Перший рядок: що саме закрите. */
  subject: string;
  /** Другий рядок: хто відкриває доступ. */
  hint: string;
  /** Повторити запит про допуск. */
  onRetry: () => void;
}

/** Екран відмови: лого, два рядки й дві дії. */
export function AccessDeniedPage({ subject, hint, onRetry }: AccessDeniedPageProps) {
  const askHref = `https://t.me/${BOT_USERNAME}?text=${encodeURIComponent(ASK_TEXT)}`;

  return (
    <div className="wb-auth">
      <div className="wb-auth-card">
        <div className="wb-auth-logo">
          <span className="wb-auth-logo-icon">✦</span>
          <span className="wb-auth-logo-text">WWWUABOT</span>
        </div>
        <p className="wb-auth-message">{subject}</p>
        <p className="wb-auth-message">{hint}</p>
        <a href={askHref} className="wb-btn wb-btn-telegram wb-auth-submit">
          <Icon name="mail" size={16} />
          Написати в Telegram
        </a>
        <button type="button" onClick={onRetry} className="wb-btn wb-btn-secondary">
          <Icon name="refresh" size={16} />
          Спробувати ще раз
        </button>
      </div>
    </div>
  );
}
