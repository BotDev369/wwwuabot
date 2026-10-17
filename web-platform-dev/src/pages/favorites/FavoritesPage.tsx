/**
 * «Обране» — список збереженого з двох видів порядку: дата або назва.
 *
 * Ліва частина рядка відкриває сторінку, знак праворуч знімає лайк: дві кнопки
 * з підписами читались як форма. Порядок рахує чиста `sortFavorites`.
 *
 * @module web-platform-dev/src/pages/favorites/FavoritesPage
 */

import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { formatDay } from "@wwwuabot/shared/utils/datetime";
import { sortFavorites, type FavoriteItem, type FavoriteSort } from "@wwwuabot/shared/favorites";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import { useFavorites } from "./useFavorites";

/** Два вибори порядку — з тим самим підписом, що в списку (`aria-label`). */
const SORTS: readonly { key: FavoriteSort; label: string }[] = [
  { key: "date", label: "Спочатку нові" },
  { key: "name", label: "За назвою" },
];

const KIND_LABELS = { page: "Сторінка", user: "Людина" } as const;

/** Підпис під назвою: вид і коли додали — те, за чим порядок і вибирають. */
function metaLabel(item: FavoriteItem): string {
  const kind = KIND_LABELS[item.kind];
  return item.savedAt ? `${kind} · додано ${formatDay(item.savedAt)}` : kind;
}

function FavoriteThumb({ item }: { item: FavoriteItem }): ReactElement {
  return (
    <span className="wb-favorites-thumb">
      {item.photoUrl ? (
        <img className="wb-favorites-photo" src={item.photoUrl} alt="" loading="lazy" />
      ) : (
        <Icon name={item.kind === "user" ? "user" : "page"} size={22} />
      )}
    </span>
  );
}

export function FavoritesPage(): ReactElement {
  useScreenChrome({ title: "Обране" });
  const favorites = useFavorites();
  const navigate = useNavigate();
  const items = sortFavorites(favorites.items, favorites.sort);
  const showList = !favorites.loading && !favorites.error && items.length > 0;

  return (
    <div className="wb-page">
      {favorites.loading && <p className="wb-text-muted">Завантаження…</p>}
      {favorites.error && (
        <div className="wb-empty">
          <p className="wb-empty-text">{favorites.error}</p>
          <button className="wb-btn wb-btn-secondary" onClick={() => void favorites.reload()}>
            Повторити
          </button>
        </div>
      )}
      {!favorites.loading && !favorites.error && items.length === 0 && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="thumbs-up" size={32} />
          </span>
          <p className="wb-empty-text">Тут буде все, що ви вподобали.</p>
          <p className="wb-text-muted">Натисніть «Лайк» на сторінці.</p>
        </div>
      )}

      {showList && (
        <div className="wb-favorites-head">
          <p className="wb-favorites-count">{items.length} у обраному</p>
          <div className="wb-favorites-sort" role="group" aria-label="Порядок обраного">
            {SORTS.map((option) => {
              const active = favorites.sort === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  className={`wb-chip wb-tools-chip wb-favorites-sort-btn${
                    active ? " wb-favorites-sort-btn--on" : ""
                  }`}
                  aria-pressed={active}
                  onClick={() => favorites.setSort(option.key)}
                >
                  <span className="wb-tools-chip-label">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="wb-favorites-list">
        {showList &&
          items.map((item) => (
            <div
              className={`wb-favorites-row${item.href ? "" : " wb-favorites-row--gone"}`}
              key={`${item.kind}:${item.targetId}`}
            >
              {item.href ? (
                <button
                  type="button"
                  className="wb-favorites-open"
                  onClick={() => void navigate(item.href!)}
                >
                  <FavoriteThumb item={item} />
                  <span className="wb-favorites-text">
                    <span className="wb-favorites-title">{item.title}</span>
                    <span className="wb-favorites-meta">{metaLabel(item)}</span>
                  </span>
                  <span className="wb-favorites-more">
                    <Icon name="chevron-right" size={18} />
                  </span>
                </button>
              ) : (
                <div className="wb-favorites-open">
                  <FavoriteThumb item={item} />
                  <span className="wb-favorites-text">
                    <span className="wb-favorites-title">{item.title}</span>
                    {/* Зниклий контент каже про це словами: рядок без адреси
                        інакше обіцяв би перехід, якого немає. */}
                    <span className="wb-favorites-meta">Контент видалено або доступ закрито.</span>
                  </span>
                </div>
              )}
              <button
                type="button"
                className="wb-favorites-remove"
                aria-label={item.href ? `Прибрати лайк: ${item.title}` : "Прибрати лайк"}
                title="Прибрати лайк"
                disabled={favorites.busy !== null}
                onClick={() => void favorites.remove(item)}
              >
                <Icon name="heart" size={18} />
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
