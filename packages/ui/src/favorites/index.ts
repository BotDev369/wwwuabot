/**
 * `@wwwuabot/ui/favorites` — серце й позначка обраного.
 *
 * `useFavorite` — стан серця на сторінку або профіль, `LikeToast` — коротке
 * підтвердження дії, `useFavoritesCount` — одне число на весь застосунок.
 *
 * @module @wwwuabot/ui/favorites
 */

export { useFavorite } from "./useFavorite";
export { LikeToast, LIKE_TOAST_MS } from "./LikeToast";
export { announceLike, onLikeAnnounced } from "./like-feedback";
export type { LikeFeedback } from "./like-feedback";
export { favoritesCount, setFavoritesCount, bumpFavoritesCount } from "./favorites-count";
export { loadFavoritesCount, useFavoritesCount } from "./useFavoritesCount";
