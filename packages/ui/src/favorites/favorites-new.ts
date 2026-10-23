/**
 * Скільки **нового** в обраному — одне число на весь застосунок: усе обране
 * показує сам екран, а позначка каже «є те, чого ти ще не бачив» (тому її
 * обнуляє відкритий список). Змінюють його серце й екран «Обране».
 *
 * @module packages/ui/src/favorites/favorites-new
 */

const listeners = new Set<() => void>();
let count = 0;

export function favoritesNewCount(): number {
  return count;
}

export function setFavoritesNewCount(next: number): void {
  const value = Number.isFinite(next) ? Math.max(0, Math.trunc(next)) : 0;
  if (value === count) return;
  count = value;
  for (const listener of listeners) listener();
}

/** Зсув на одиницю — саме те, що каже серце: лайк додано або знято. */
export function bumpFavoritesNew(delta: number): void {
  setFavoritesNewCount(count + delta);
}

export function subscribeFavoritesNew(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
