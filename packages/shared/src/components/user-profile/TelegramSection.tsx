import { FieldRow } from "./FieldRow";
import { RawJsonDetails } from "./RawJsonDetails";
import { ico } from "./badges";
import {
  TELEGRAM_FIELD_LABELS,
  TELEGRAM_SESSION_LABELS,
  formatTelegramValue,
} from "./telegram-field-labels";
import type { UserProfileData } from "./types";

/**
 * Усе, що Telegram віддав про людину.
 *
 * Абзацу-пояснення над полями немає навмисно: заголовок уже називає джерело, а
 * решта — те саме слово, сказане двічі. Те, чого з полів **не** видно
 * (що ці дані не редагуються тут), каже той, хто знає, кому це потрібно:
 * сторінка акаунта.
 *
 * Поля не перелічені списком у розмітці — вони перебираються з payload. Це
 * навмисно: Telegram додає нові (`is_premium`, `added_to_menu`,
 * `allows_write_to_pm`, …), і вони з'являються в профілі самі, без правки
 * коду. Невідомий ключ показується своїм ім'ям — краще побачити `foo_bar`,
 * ніж не побачити нічого.
 *
 * `omit` — ті ключі, які вже стоять **у шапці** сторінки (фото, ім'я, хендл).
 * Один факт має одне місце: без цього ім'я й хендл стояли б у профілі людини
 * двічі поспіль — у шапці й першими рядками списку.
 */
export function TelegramSection({
  user,
  omit,
}: {
  user: UserProfileData;
  omit?: readonly string[];
}) {
  const telegram = user.telegram ?? null;
  const session = user.telegramSession ?? null;
  const telegramKeys = (telegram ? Object.keys(telegram) : []).filter(
    (key) => !omit?.includes(key),
  );
  const sessionKeys = session ? Object.keys(session) : [];

  return (
    <div className="wb-profile">
      <h3 className="wb-profile-title">{ico("bot")} Дані від Telegram</h3>

      {telegramKeys.length > 0 ? (
        <div className="wb-profile-fields">
          {telegramKeys.map((key) => (
            <FieldRow
              key={key}
              label={TELEGRAM_FIELD_LABELS[key] ?? key}
              value={formatTelegramValue(key, telegram?.[key])}
            />
          ))}
        </div>
      ) : (
        <p className="wb-profile-note">Telegram не віддав даних про користувача.</p>
      )}

      {sessionKeys.length > 0 && (
        <details className="wb-profile-details">
          <summary className="wb-profile-summary">
            {ico("info", 14)} <span>Дані сеансу Mini App</span>
          </summary>
          <div className="wb-profile-fields wb-profile-subfields">
            {sessionKeys.map((key) => (
              <FieldRow
                key={key}
                label={TELEGRAM_SESSION_LABELS[key] ?? key}
                value={formatTelegramValue(key, session?.[key])}
              />
            ))}
          </div>
        </details>
      )}

      <RawJsonDetails value={{ user: telegram, session }} />
    </div>
  );
}
