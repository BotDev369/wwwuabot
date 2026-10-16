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

/**
 * Номер цілі з того, що надіслав клієнт: число або рядок `ContentPage.id` —
 * контент віддає свій id рядком, а `target_id` у базі питають як номер.
 *
 * `null` — не «порожньо», а «це не ціль»: нуль і від'ємне не є номером рядка
 * (`AUTOINCREMENT` починається з одиниці), а `""`, `"abc"` чи адреса сторінки
 * текстовою ціллю не стануть.
 */
export function favoriteTargetId(raw: unknown): number | null {
  const value = typeof raw === "string" && /^\d+$/.test(raw.trim()) ? Number(raw) : raw;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) return null;
  return value;
}

/** Розібрана ціль із тіла запиту; `null` — тіло не про обране. */
export function favoriteTarget(raw: unknown): FavoriteTarget | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = raw as Record<string, unknown>;
  if (!FAVORITE_KINDS.includes(value.kind as FavoriteKind)) return null;
  const targetId = favoriteTargetId(value.targetId);
  if (targetId === null) return null;
  return { kind: value.kind as FavoriteKind, targetId };
}
