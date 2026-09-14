import { useEffect, useState } from "react";
import { readUserProfile } from "../../shared/api/users.api";
import { UserProfileCard, type UserProfileData, icons } from "@wwwuabot/shared";

interface Props {
  userId: number;
  onClose: () => void;
  onEdit: (userId: number) => void;
  onMessage: (userId: number) => void;
}

/**
 * Модалка профілю користувача в адмінці.
 *
 * Тут лишається рівно те, чим вона відрізняється від платформи: це модалка, і
 * в ній є дії адміна. Сам профіль — спільний `UserProfileCard`, а перетворення
 * рядка `users` у його дані живе в `shared/api/user-profile-row` (ним же
 * користується і сторінка `/profile`).
 */
export function UserCardModal({ userId, onClose, onEdit, onMessage }: Props) {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetching: setState in readUserProfile().then/.catch
    setLoading(true);
    setError(null);
    readUserProfile(userId)
      .then((data) => {
        if (!cancelled) {
          setProfile(data);
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
