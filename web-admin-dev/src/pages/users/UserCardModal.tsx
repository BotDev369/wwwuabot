import { useEffect, useState } from "react";
import { readUser, type UserRow } from "../../shared/api/users.api";
import { UserProfileCard, type UserProfileData, icons } from "@wwwuabot/shared";

interface Props {
  userId: number;
  onClose: () => void;
  onEdit: (userId: number) => void;
  onMessage: (userId: number) => void;
}

/**
 * `telegram_json` з рядка `users` → об'єкт. Пише його `bot-dev` (усе, що
 * Telegram віддав про людину), читає — ця картка, і саме тому адмінка бачить
 * ті самі поля, що й користувач у TWA, навіть якщо в браузері `initData` немає.
 */
function parseTelegramJson(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Convert raw DB row to normalized UserProfileData */
function rowToProfile(row: UserRow): UserProfileData {
  const r = row as Record<string, unknown>;

  // Parse permissions
  let permissions: string[] = [];
  const permsRaw = r.permissions;
  if (typeof permsRaw === "string" && permsRaw) {
    try {
      const parsed = JSON.parse(permsRaw);
      if (Array.isArray(parsed)) permissions = parsed;
    } catch {
      permissions = permsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  // Collect raw admin-only fields
  // `platform_username` і `telegram_json` тут не «додаткові»: перше має власний
  // блок угорі картки, друге — розділ «Дані від Telegram», тому в сирому
  // переліку вони були б третім і четвертим показом того самого.
  const SKIP_FIELDS = new Set([
    "user_id",
    "first_name",
    "last_name",
    "username",
    "language",
    "role",
    "tariff",
    "status",
    "discount",
    "permissions",
    "is_blocked",
    "platform_username",
    "telegram_json",
    "created_at",
    "updated_at",
  ]);
  const rawFields: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(r)) {
    if (!SKIP_FIELDS.has(key) && val !== null && val !== undefined && val !== "") {
      rawFields[key] = val;
    }
  }

  return {
    id: r.user_id as number,
    firstName: r.first_name as string | null,
    lastName: r.last_name as string | null,
    username: r.username as string | null,
    platformUsername: (r.platform_username as string | null) ?? null,
    language: r.language as string | null,
    telegram: parseTelegramJson(r.telegram_json),
    role: r.role as string | null,
    tariff: r.tariff as string | null,
    status: r.status as string | null,
    discount: r.discount as number | null,
    permissions,
    isBlocked: r.is_blocked as number | null,
    createdAt: r.created_at as string | null,
    updatedAt: r.updated_at as string | null,
    rawFields: Object.keys(rawFields).length > 0 ? rawFields : undefined,
  };
}

export function UserCardModal({ userId, onClose, onEdit, onMessage }: Props) {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetching: setState in readUser().then/.catch
    setLoading(true);
    setError(null);
    readUser(userId)
      .then((data) => {
        if (!cancelled) {
          setProfile(data ? rowToProfile(data) : null);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError((e as Error).message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="wb-modal-overlay" onClick={onClose}>
      <div className="wb-modal wb-modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="wb-modal-header">
          <span className="wb-modal-title">
            {loading ? "Завантаження…" : error ? "Помилка" : `#${userId}`}
          </span>
          <button className="wb-close-btn" onClick={onClose}>
            {icons["close"]}
          </button>
        </div>

        <div className="wb-modal-body">
          <UserProfileCard
            user={profile!}
            variant="admin"
            loading={loading}
            error={error}
            onEdit={onEdit}
            onMessage={onMessage}
          />
        </div>
      </div>
    </div>
  );
}
