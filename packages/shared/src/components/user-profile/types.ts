/** Normalized user data — works for both platform (TWA+API) and admin (full DB row) */
export interface UserProfileData {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  language?: string | null;
  photoUrl?: string | null;
  isPremium?: boolean;
  isBot?: boolean;
  addedToMenu?: boolean;
  // DB fields
  role?: string | null;
  tariff?: string | null;
  status?: string | null;
  discount?: number | null;
  permissions?: string[];
  isBlocked?: number | null;
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
  onEdit?: (userId: number) => void;
  onMessage?: (userId: number) => void;
  onClose?: () => void;
}
