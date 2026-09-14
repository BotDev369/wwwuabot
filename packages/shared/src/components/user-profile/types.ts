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
  /** Решта `initData` (`auth_date`, `chat_type`, `start_param`, …) — дані сеансу. */
  telegramSession?: Record<string, string> | null;
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

export interface UserProfileCardProps {
  user: UserProfileData;
  variant?: "platform" | "admin";
  loading?: boolean;
  error?: string | null;
  /**
   * Зберегти ім'я на платформі. Немає обробника — немає й редагування:
   * саме так цей блок стає читабельним (адмінка не переписує чуже ім'я).
   */
  onChangeUsername?: (value: string) => Promise<string | null>;
  onEdit?: (userId: number) => void;
  onMessage?: (userId: number) => void;
  onClose?: () => void;
}
