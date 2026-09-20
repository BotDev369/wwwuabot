/** Дані профілю, зведені до одного вигляду — для обох оболонок */
export interface UserProfileData {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  /** Telegram-хендл (`@handle`) — дані Telegram, не наш ідентифікатор. */
  username?: string | null;
  /** Ім'я на платформі (wwwuabot) — його обирає сам користувач. */
  platformUsername?: string | null;
  language?: string | null;
  /**
   * Фото **платформи** — те, яке людина поставить собі сама.
   *
   * Не аватар Telegram: другий приходить усередині `telegram.photo_url`, і
   * змішувати їх не можна — людина побачила б чуже фото під своїм іменем
   * (`components/user-profile/account.ts`).
   */
  photoUrl?: string | null;
  isPremium?: boolean;
  isBot?: boolean;
  addedToMenu?: boolean;
  /**
   * Усе, що Telegram віддав про користувача (`initData.user` **як є**).
   * Платформа бере живе значення з підписаного initData, адмінка — збережене
   * ботом; різниця лише в джерелі, а не у вигляді.
   */
  telegram?: Record<string, unknown> | null;
  // DB fields
  role?: string | null;
  tariff?: string | null;
  status?: string | null;
  discount?: number | null;
  permissions?: string[];
  isBlocked?: number | boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  // Admin-only: raw DB fields
  rawFields?: Record<string, unknown>;
}

/**
 * Картка **адмінки**: те, що потрібно тому, хто дивиться на чужого
 * користувача, — повний рядок `users`, роль, тариф, права, сирі поля й дії.
 *
 * Свого профілю тут немає навмисно: людина бачить себе на **своїй** сторінці
 * акаунта (`/profile/account` у платформі), і там дані розділені на «наше» й
 * «Telegram», без технічних полів. Один екран на дві потреби зробив би або
 * адмінку сліпою, або людину — читачем нашого дампу.
 */
export interface UserProfileCardProps {
  user: UserProfileData;
  loading?: boolean;
  error?: string | null;
  onEdit?: (userId: number) => void;
  onMessage?: (userId: number) => void;
}
