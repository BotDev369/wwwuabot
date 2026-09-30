/** Обране зберігає лише посилання на сутність, не копію приватного контенту. */
export const FAVORITE_KINDS = ["page", "user"] as const;
export type FavoriteKind = (typeof FAVORITE_KINDS)[number];
export interface FavoriteTarget {
  kind: FavoriteKind;
  targetId: number;
}
export interface FavoriteItem extends FavoriteTarget {
  title: string;
  href: string | null;
}
export interface FavoritesResponse {
  ok: boolean;
  items: FavoriteItem[];
}

export function favoriteTarget(raw: unknown): FavoriteTarget | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = raw as Record<string, unknown>;
  if (!FAVORITE_KINDS.includes(value.kind as FavoriteKind)) return null;
  if (
    typeof value.targetId !== "number" ||
    !Number.isSafeInteger(value.targetId) ||
    value.targetId <= 0
  ) {
    return null;
  }
  return { kind: value.kind as FavoriteKind, targetId: value.targetId };
}
