import type { ReactElement } from "react";
import { AccountAvatar } from "./AccountAvatar";
import { FieldRow } from "./FieldRow";
import { accountInitial, telegramHandle, telegramName, telegramPhoto } from "./account";
import { ico } from "./badges";
import { telegramFields } from "./telegram-fields";
import type { UserProfileData } from "./types";

/** Порожнє місце в шапці лишається на своєму місці — з `...`. */
const EMPTY = "...";

/**
 * Картка «Дані від Telegram» — **один** блок: хто це в Telegram і що про нього
 * відомо.
 *
 * **Шапка всередині картки, а не поруч.** Фото, повне ім'я (`first_name` +
 * `last_name`) і `@юзернейм` — це теж дані Telegram; окрема картка з ними казала
 * б «ось акаунт, а ось його дані», хоч і те, й те дає Telegram. Два блоки ще й
 * розходились виглядом (у шапки не було заголовка, у полів — був), і сторінка
 * читалась як різні речі замість одного екрана.
 *
 * **Склад і порядок полів живуть у `telegram-fields.ts`** (дані та чисті
 * функції), а тут — самé показання. Це не формальність: перелік, виписаний у
 * розмітці, розходиться з payload першим (зник рядок преміуму, додався
 * невідомий ключ), а перелік, що перебирає ключі «як є», показує `Прізвище …`
 * замість того, щоб його не показувати.
 *
 * **Фото тут не рядок**, а круг у шапці: адреса картинки в переліку не додає
 * нічого, а сама картинка стоїть над ним.
 *
 * **Нашого дампу тут немає.** Дані сеансу Mini App і сирий JSON стояли тут
 * тимчасово — для відловлювання багів; показувати людині наш дамп не профіль, і
 * живуть вони в логах та в адмінці.
 */
export function TelegramSection({ user }: { user: UserProfileData }): ReactElement | null {
  const fields = telegramFields(user.telegram ?? null);
  if (fields.length === 0) return null;

  // Ім'я тут справжнє, а `...` — лише в підписі: літера в крузі береться з
  // імені, і крапка від `...` читалась би як чужий аватар.
  const name = telegramName(user);
  const handle = telegramHandle(user);

  return (
    <div className="wb-profile">
      <h3 className="wb-profile-title">{ico("bot")} Дані від Telegram</h3>

      <div className="wb-account-head">
        <AccountAvatar
          photo={telegramPhoto(user)}
          initial={accountInitial(user, name)}
          alt="Фото Telegram"
        />
        <span className="wb-account-head-text">
          <span className="wb-account-head-title">{name ?? EMPTY}</span>
          <span className="wb-account-head-note">{handle ?? EMPTY}</span>
        </span>
      </div>

      <div className="wb-profile-fields">
        {fields.map((field) => (
          <FieldRow key={field.key} label={field.label} value={field.value} />
        ))}
      </div>
    </div>
  );
}
