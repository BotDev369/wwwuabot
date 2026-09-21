import type { ReactElement } from "react";
import { Icon, PublicUserCard, type PublicProfile } from "@wwwuabot/shared";
import { useNavigate } from "react-router-dom";
import { spaceUserPath } from "@/app/routes";

/**
 * «Користувачі» — люди, які самі відкрили свій профіль.
 *
 * **Порожнеча має причину.** «Нікого немає» без пояснення читалось би як
 * поламана стрічка, тож текст каже, **чому** тут порожньо: профіль з'являється
 * тоді, коли людина сама його відкриє. Це не наше заповнення — це ознака
 * порожнього Простору.
 *
 * **Картка бере адресу з однієї функції** (`spaceUserPath`): шлях людини
 * складається в одному місці, а не клеїться тут.
 */
export function SpaceUsersTab({
  items,
  loading,
  error,
  onRetry,
}: {
  items: PublicProfile[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}): ReactElement {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="wb-empty">
        <div className="wb-skeleton" style={{ width: 180, height: 20 }} />
        <p className="wb-text-muted">Завантаження…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wb-empty">
        <span className="wb-empty-icon">
          <Icon name="warning" size={32} />
        </span>
        <p className="wb-text-red">{error}</p>
        <button className="wb-btn wb-btn-secondary" onClick={onRetry}>
          Спробувати ще
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="wb-empty">
        <span className="wb-empty-icon">
          <Icon name="users" size={32} />
        </span>
        <p className="wb-empty-text">
          Тут поки нікого немає. Профіль з'являється, коли людина сама відкриє його в себе в
          акаунті.
        </p>
      </div>
    );
  }

  return (
    <div className="wb-people">
      {items.map((profile) => (
        <PublicUserCard
          key={profile.id}
          profile={profile}
          onSelect={() => navigate(spaceUserPath(profile.id))}
        />
      ))}
    </div>
  );
}
