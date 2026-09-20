import { FieldRow } from "./FieldRow";
import { ico } from "./badges";
import { telegramFields } from "./telegram-fields";
import type { UserProfileData } from "./types";

/**
 * Картка «Дані від Telegram» — те, що Telegram знає про людину.
 *
 * Склад і порядок полів живуть у `telegram-fields.ts` (дані та чисті функції),
 * а тут — самé показання. Це не формальність: перелік, виписаний у розмітці,
 * розходиться з payload першим (зник рядок преміуму, додався невідомий ключ), а
 * перелік, що перебирає ключі «як є», показує `Прізвище …` замість того, щоб
 * його не показувати.
 *
 * **Фото тут не рядок**, а шапка картки: адреса картинки в переліку не додає
 * нічого, а сама картинка стоїть над ним. Тому ж фото немає серед полів.
 *
 * **Нашого дампу тут немає.** Дані сеансу Mini App і сирий JSON стояли тут
 * тимчасово — для відловлювання багів; показувати людині наш дамп не профіль, і
 * живуть вони в логах та в адмінці.
 */
export function TelegramSection({ user }: { user: UserProfileData }) {
  const fields = telegramFields(user.telegram ?? null);
  if (fields.length === 0) return null;

  return (
    <div className="wb-profile">
      <h3 className="wb-profile-title">{ico("bot")} Дані від Telegram</h3>

      <div className="wb-profile-fields">
        {fields.map((field) => (
          <FieldRow key={field.key} label={field.label} value={field.value} />
        ))}
      </div>
    </div>
  );
}
