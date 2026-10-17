/**
 * Скільки в людини обраного — одне число на весь застосунок.
 *
 * Його змінюють серце, екран «Обране» і смуга при вході; три копії стану
 * розійшлися б. Модульний, бо провайдер мав би стояти над хедером і смугою.
 *
 * @module packages/ui/src/favorites/favorites-count
 */

const listeners = new Set<() => void>();
let count = 0;

export function favoritesCount(): number {
  return count;
}

export function setFavoritesCount(next: number): void {
  const value = Number.isFinite(next) ? Math.max(0, Math.trunc(next)) : 0;
  if (value === count) return;
  count = value;
  for (const listener of listeners) listener();
}

/** Зсув на одиницю — саме те, що каже серце: лайк додано або знято. */
export function bumpFavoritesCount(delta: number): void {
  setFavoritesCount(count + delta);
}

export function subscribeFavoritesCount(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
