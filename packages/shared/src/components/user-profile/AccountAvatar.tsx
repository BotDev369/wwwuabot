/**
 * Круг акаунта в тілі розділу: фото, а як його немає — літера.
 *
 * Один компонент на **обидва** розділи сторінки акаунта («Платформа» й
 * «Телеграм»), і це не економія: круг мусить виглядати однаково, бо він і
 * читається як «те саме місце, лише різний акаунт». Дві розмітки розійшлися б
 * розміром на першій же правці, і око бачило б різні речі там, де різниця лише
 * в полі з даними.
 *
 * Літера береться з підпису поруч (`accountInitial`): літера, що не збігається
 * з іменем, читалась би як чужий аватар.
 *
 * @module @wwwuabot/shared/components/user-profile/AccountAvatar
 */

import type { ReactElement } from "react";

export interface AccountAvatarProps {
  /** Адреса фото. Порожньо — у крузі стоїть літера, а не зламане зображення. */
  photo?: string | undefined;
  /** Літера замість фото — та сама, що в підписі поруч. */
  initial: string;
  /** Для скрін-рідера: котре з двох фото це. */
  alt: string;
}

export function AccountAvatar({ photo, initial, alt }: AccountAvatarProps): ReactElement {
  return (
    <span className="wb-account-photo wb-account-photo--lg">
      {photo ? (
        <img src={photo} alt={alt} />
      ) : (
        <span className="wb-account-initial">{initial}</span>
      )}
    </span>
  );
}
