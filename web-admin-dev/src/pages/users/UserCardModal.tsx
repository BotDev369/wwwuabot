import { useEffect, useState } from "react";
import { readUser, type UserRow } from "../../shared/api/users.api";
import { UserProfileCard, type UserProfileData } from "@wwwuabot/shared";

interface Props {
  userId: number;
  onClose: () => void;
  onEdit: (userId: number) => void;
  onMessage: (userId: number) => void;
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
      permissions = permsRaw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  // Collect raw admin-only fields
  const SKIP_FIELDS = new Set([
    "user_id", "first_name", "last_name", "username", "language",
    "role", "tariff", "status", "discount", "permissions",
    "is_blocked", "created_at", "updated_at",
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
    language: r.language as string | null,
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
    return () => { cancelled = true; };
  }, [userId]);

  return (
    <div className="usr-modal-overlay" onClick={onClose}>
      <div className="usr-modal usr-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="usr-modal-header">
          <span className="usr-modal-title">
            {loading ? "Завантаження…" : error ? "Помилка" : `#${userId}`}
          </span>
          <button className="usr-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="usr-modal-body">
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
