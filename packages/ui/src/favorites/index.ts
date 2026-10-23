/**
 * `@wwwuabot/ui/favorites` — серце й позначка обраного.
 *
 * `useFavorite` — стан серця на сторінку або профіль, `LikeToast` — коротке
 * підтвердження дії, `useFavoritesNewCount` — одне число **нового** на весь
 * застосунок (усе обране показує сам екран).
 * @module @wwwuabot/ui/favorites
 */

export { useFavorite } from "./useFavorite";
export { LikeToast, LIKE_TOAST_MS } from "./LikeToast";
export { announceLike, onLikeAnnounced } from "./like-feedback";
export type { LikeFeedback } from "./like-feedback";
export {
  favoritesNewCount,
  setFavoritesNewCount,
  bumpFavoritesNew,
  subscribeFavoritesNew,
} from "./favorites-new";
export { useFavoritesNewCount } from "./useFavoritesNew";
