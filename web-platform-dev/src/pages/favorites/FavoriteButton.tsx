import { Icon } from "@wwwuabot/shared";
import type { FavoriteTarget } from "@wwwuabot/shared/favorites";
import { useFavorite } from "./useFavorite";

export function FavoriteButton({ target }: { target: FavoriteTarget }) {
  const favorite = useFavorite(target);
  const label = favorite.failed
    ? "Повторити перевірку лайка"
    : favorite.liked
      ? "Прибрати лайк"
      : "Лайк";
  return (
    <button
      type="button"
      className={`wb-btn ${favorite.liked ? "wb-btn-primary" : "wb-btn-secondary"}`}
      aria-label={label}
      aria-pressed={favorite.liked}
      disabled={favorite.busy}
      onClick={() => void favorite.toggle()}
    >
      <Icon name="thumbs-up" size={18} />
      {label}
    </button>
  );
}
