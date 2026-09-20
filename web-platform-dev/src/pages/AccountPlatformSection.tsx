/**
 * Розділ «Платформа» — наш акаунт: фото й ім'я.
 *
 * Два блоки, і це не подрібнення заради рівності: **фото** й **ім'я** — різні
 * речі. Фото ще не можна поставити, і про це сказано словами (порожнє коло без
 * пояснення читалось би як поламане зображення). Ім'я вже є — його людина
 * обрала, і саме воно поводить її в продукті.
 *
 * Пояснень понад це немає: людина прийшла подивитись і, може, змінити ім'я, а
 * не прочитати нашу логіку ідентичності.
 *
 * @module web-platform-dev/src/pages/AccountPlatformSection
 */

import type { ReactElement } from "react";
import {
  PlatformHandle,
  accountInitial,
  platformLabel,
  platformPhoto,
  type UserProfileData,
} from "@wwwuabot/shared";

export function AccountPlatformSection({
  user,
  onChangeUsername,
}: {
  user: UserProfileData;
  onChangeUsername: (value: string) => Promise<string | null>;
}): ReactElement {
  const name = platformLabel(user);
  const photo = platformPhoto(user);

  return (
    <>
      <section className="wb-profile">
        <div className="wb-account-head">
          <span className="wb-account-photo wb-account-photo--lg">
            {photo ? (
              <img src={photo} alt="Фото на платформі" />
            ) : (
              <span className="wb-account-initial">{accountInitial(user, name)}</span>
            )}
          </span>
          <span className="wb-account-head-text">
            <span className="wb-account-head-title">Фото</span>
            <span className="wb-account-head-note">
              {photo
                ? "Так вас бачать інші."
                : "Скоро тут можна буде поставити своє фото — зараз його ще немає."}
            </span>
          </span>
        </div>
      </section>

      <PlatformHandle value={user.platformUsername} onSubmit={onChangeUsername} />
    </>
  );
}
