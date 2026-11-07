/**
 * «Обране» — список збереженого з двох порядків: дата або назва, і порядок
 * живе в контекстному футері (`ContextBar`), а не над списком. Слова екрана
 * приходять із рядка `scenarios` (`docs/SCREEN_TEXTS.md`), а рядок відкриває
 * сторінку й прибирає лайк знаком — дві кнопки з підписами читались як форма.
 * @module web-platform-dev/src/pages/favorites/FavoritesPage
 */

import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, type IconName } from "@wwwuabot/shared";
import { formatDay } from "@wwwuabot/shared/utils/datetime";
import { sortFavorites, type FavoriteItem, type FavoriteSort } from "@wwwuabot/shared/favorites";
import type { ScreenTexts } from "@wwwuabot/shared/screens";
import { formatScreenText, screenText } from "@wwwuabot/shared/screens";
import { ContextBar, useScreenChrome } from "@wwwuabot/ui/nav";
import { useDialog } from "@wwwuabot/ui/dialog";
import { useScreenTexts } from "../screen-texts/useScreenTexts";
import { useFavorites } from "./useFavorites";

const SCREEN_KEY = "favorites";

/** Два порядки: підпис — ключ у рядку екрана, знак — той самий, що в смузі дій. */
const SORTS: readonly { key: FavoriteSort; textKey: string; icon: IconName }[] = [
  { key: "date", textKey: "favorites.sort.date", icon: "calendar" },
  { key: "name", textKey: "favorites.sort.name", icon: "text" },
];

/** Підпис під назвою: вид і коли додали — те, за чим порядок і вибирають. */
function metaLabel(item: FavoriteItem, texts: ScreenTexts): string {
  const kind = screenText(
    texts,
    item.kind === "user" ? "favorites.kind.user" : "favorites.kind.page",
  );
  if (!item.savedAt) return kind;
  const added = formatScreenText(texts, "favorites.meta.added", {
    date: formatDay(item.savedAt),
  });
  return `${kind} · ${added}`;
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
  const { texts, ready } = useScreenTexts(SCREEN_KEY);
  useScreenChrome({ title: screenText(texts, "favorites.title") });
  const favorites = useFavorites();
  const dialog = useDialog();
  const navigate = useNavigate();
  const items = sortFavorites(favorites.items, favorites.sort);
  const showList = !favorites.loading && !favorites.error && items.length > 0;
  const removeLabel = screenText(texts, "favorites.remove");

  /** Прибирання — дія рядка; причина невдачі приходить словами екрана. */
  async function remove(item: FavoriteItem): Promise<void> {
    if (await favorites.remove(item)) return;
    await dialog.alert(screenText(texts, "favorites.error.remove"), { tone: "danger" });
  }

  // Поки слів немає, екран не малює ні їх, ні заглушок: рядок у базі — джерело.
  if (!ready) return <div className="wb-page" />;

  return (
    <div className="wb-page">
      {favorites.loading && (
        <p className="wb-text-muted">{screenText(texts, "favorites.loading")}</p>
      )}
      {favorites.error && (
        <div className="wb-empty">
          <p className="wb-empty-text">{screenText(texts, "favorites.error.load")}</p>
          <button className="wb-btn wb-btn-secondary" onClick={() => void favorites.reload()}>
            {screenText(texts, "favorites.retry")}
          </button>
        </div>
      )}
      {!favorites.loading && !favorites.error && items.length === 0 && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="thumbs-up" size={32} />
          </span>
          <p className="wb-empty-text">{screenText(texts, "favorites.empty.title")}</p>
          <p className="wb-text-muted">{screenText(texts, "favorites.empty.hint")}</p>
        </div>
      )}

      {showList && (
        <p className="wb-favorites-count">
          {formatScreenText(texts, "favorites.count", { n: String(items.length) })}
        </p>
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
                    <span className="wb-favorites-meta">{metaLabel(item, texts)}</span>
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
                    <span className="wb-favorites-meta">{screenText(texts, "favorites.gone")}</span>
                  </span>
                </div>
              )}
              {/* Прибрати — **не серце**: серце тут означало б другу дію з тим
                  самим знаком (`heart`), і людина тиснула б його, думаючи, що
                  ставить лайк. Смітник — це те саме «видалити», що й у решті
                  продукту. */}
              <button
                type="button"
                className="wb-favorites-remove"
                aria-label={
                  item.href
                    ? formatScreenText(texts, "favorites.remove.named", { title: item.title })
                    : removeLabel
                }
                title={removeLabel}
                disabled={favorites.busy !== null}
                onClick={() => void remove(item)}
              >
                <Icon name="trash" size={18} />
              </button>
            </div>
          ))}
      </div>

      {/* Порядок — дія екрана, тож стоїть у контекстному футері: у списку він
          забирав рядок над першою ж карткою. */}
      {showList && (
        <ContextBar
          label={screenText(texts, "favorites.sort.bar")}
          actions={SORTS.map((option) => ({
            key: option.key,
            label: screenText(texts, option.textKey),
            icon: option.icon,
            active: favorites.sort === option.key,
            onSelect: () => favorites.setSort(option.key),
          }))}
        />
      )}
    </div>
  );
}
