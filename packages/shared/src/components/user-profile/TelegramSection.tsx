import { FieldRow } from "./FieldRow";
import { ico } from "./badges";
import { TELEGRAM_FIELD_LABELS, telegramFieldValue } from "./telegram-field-labels";
import type { UserProfileData } from "./types";

/**
 * Усе, що Telegram віддав про людину — **без винятків**.
 *
 * Абзацу-пояснення над полями немає навмисно: заголовок уже називає джерело, а
 * решта — те саме слово, сказане двічі. Те, чого з полів **не** видно (що ці
 * дані не редагуються тут), каже сторінка акаунта — і каже це **перед** карткою:
 * людина має знати, чому тут немає кнопки, ще до того, як почне її шукати.
 *
 * Поля не перелічені списком у розмітці — вони перебираються з payload. Це
 * навмисно: Telegram додає нові (`is_premium`, `added_to_menu`,
 * `allows_write_to_pm`, …), і вони з'являються в профілі самі, без правки
 * коду. Невідомий ключ показується своїм ім'ям — краще побачити `foo_bar`,
 * ніж не побачити нічого.
 *
 * **Ім'я, прізвище, хендл і фото теж у списку**, хоч вони є в шапці: шапка — це
 * впізнавання з першого погляду, а список — відповідь на питання «що про мене
 * взагалі відомо». Пропустити їх означало б, що найпотрібніші поля єдині, яких
 * у переліку немає, — і саме їх шукають першими (адмінська картка, де шапка
 * стоїть так само, не пропускає нічого).
 *
 * Порожнє значення — **`...`**, а не тире: у розділі чужих даних тире читається
 * як «поля немає», хоч воно є в payload і просто без значення.
 *
 * Дані сеансу Mini App і сирий JSON тут стояли **тимчасово** — для відловлювання
 * багів. Показувати людині наш дамп — не профіль, тож їх тут немає; живуть вони
 * в логах і в адмінці, де їх і читають.
 */
export function TelegramSection({ user }: { user: UserProfileData }) {
  const telegram = user.telegram ?? null;
  const telegramKeys = telegram ? Object.keys(telegram) : [];

  return (
    <div className="wb-profile">
      <h3 className="wb-profile-title">{ico("bot")} Дані від Telegram</h3>

      {telegramKeys.length > 0 ? (
        <div className="wb-profile-fields">
          {telegramKeys.map((key) => (
            <FieldRow
              key={key}
              label={TELEGRAM_FIELD_LABELS[key] ?? key}
              value={telegramFieldValue(key, telegram?.[key])}
              empty="..."
            />
          ))}
        </div>
      ) : (
        <p className="wb-profile-note">Telegram не віддав даних про користувача.</p>
      )}
    </div>
  );
}
