import { useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { useFavorites } from "./useFavorites";

export function FavoritesPage() {
  const favorites = useFavorites();
  const navigate = useNavigate();
  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">Обране</h1>
      </div>
      {favorites.loading && <p className="wb-text-muted">Завантаження…</p>}
      {favorites.error && (
        <div className="wb-empty">
          <p className="wb-empty-text">{favorites.error}</p>
          <button className="wb-btn wb-btn-secondary" onClick={() => void favorites.reload()}>
            Повторити
          </button>
        </div>
      )}
      {!favorites.loading && !favorites.error && favorites.items.length === 0 && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="thumbs-up" size={32} />
          </span>
          <p className="wb-empty-text">Тут буде все, що ви вподобали.</p>
          <p className="wb-text-muted">Натисніть «Лайк» на сторінці або в публічному профілі.</p>
        </div>
      )}
      {!favorites.loading &&
        !favorites.error &&
        favorites.items.map((item) => (
          <div className="wb-card" key={`${item.kind}:${item.targetId}`}>
            <div className="wb-card-body">
              <p className="wb-card-title">{item.title}</p>
              {item.href === null && (
                <p className="wb-text-muted">Контент видалено або доступ закрито.</p>
              )}
              <div className="wb-sheet-actions">
                {item.href && (
                  <button
                    className="wb-btn wb-btn-secondary"
                    onClick={() => void navigate(item.href!)}
                  >
                    Відкрити
                  </button>
                )}
                <button
                  className="wb-btn wb-btn-ghost"
                  disabled={favorites.busy !== null}
                  onClick={() => void favorites.remove(item)}
                >
                  <Icon name="thumbs-up" size={18} />
                  Прибрати лайк
                </button>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
