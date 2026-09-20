/**
 * Обліковий рядок — **один** рядок у хабі `/profile`, який веде на сторінку акаунта.
 *
 * Тут рівно те, що людина впізнає з одного погляду: **два фото** (своє на
 * платформі й те, що дає Telegram) і **два імені** (`#karas` — наше, `@sergiy` —
 * Telegram). Більше нічого: дані акаунта живуть на своїй сторінці, і хаб не стає
 * другою копією профілю — саме через цю копію він і був кашею з двох екранів.
 *
 * **Чому `#` і `@`.** Це не прикраса: людина мусить бачити, котре з імен наше, а
 * котре дає Telegram — друге може зникнути, і тоді в продукті лишається тільки
 * перше (AGENTS.md §2). Розділяє їх позначка, і вона одна на весь продукт
 * (`formatPlatformUsername`).
 *
 * **Рядок — кнопка, а не посилання.** Куди йти, знає оболонка (`onSelect`): у
 * платформи це маршрут, у адмінки був би інший. Тому тут немає ні `react-router`,
 * ні адреси — лише дотик на всю ширину рядка, що й потрібно пальцю.
 *
 * @module @wwwuabot/shared/components/user-profile
 */

import type { ReactElement } from "react";
import { Icon } from "../Icon";
import {
  accountInitial,
  platformLabel,
  platformPhoto,
  telegramHandle,
  telegramName,
  telegramPhoto,
} from "./account";
import type { UserProfileData } from "./types";

export interface UserAccountRowProps {
  /** Людина. `null` — даних ще немає: рядок лишається на місці, але мовчить. */
  user: UserProfileData | null;
  /** Другий рядок, поки Telegram-імені немає (завантаження, помилка). */
  note?: string | null;
  onSelect: () => void;
}

/**
 * Фото в крузі. Немає фото — **літера**: порожнє коло читалось би як поламане
 * зображення, а літера збігається з підписом поруч.
 */
function Photo({
  src,
  initial,
  alt,
}: {
  src?: string;
  initial: string;
  alt: string;
}): ReactElement {
  return (
    <span className="wb-account-photo">
      {src ? <img src={src} alt={alt} /> : <span className="wb-account-initial">{initial}</span>}
    </span>
  );
}

export function UserAccountRow({ user, note, onSelect }: UserAccountRowProps): ReactElement {
  const platform = platformLabel(user);
  const telegram = telegramHandle(user) ?? telegramName(user);
  // Другий рядок завжди щось каже: ім'я Telegram, а як його немає — причину, чому
  // рядок порожній. Порожній рядок у картці читався б як «тут нічого й не буде».
  const second = telegram ?? note ?? undefined;
  const initial = accountInitial(user, platform ?? telegram);

  return (
    <button type="button" className="wb-account-row" onClick={onSelect}>
      <span className="wb-account-photos">
        <Photo src={platformPhoto(user)} initial={initial} alt="Фото на платформі" />
        <Photo src={telegramPhoto(user)} initial={initial} alt="Фото Telegram" />
      </span>

      <span className="wb-account-names">
        <span className="wb-account-name">{platform ?? (user ? "Обрати ім'я" : "Акаунт")}</span>
        {second && <span className="wb-account-handle">{second}</span>}
      </span>

      {/* Знак «далі» — те саме, що обіцяє дотик: за рядком стоїть сторінка. */}
      <span className="wb-account-more">
        <Icon name="chevron-right" size={18} />
      </span>
    </button>
  );
}
