/** Обране зберігає лише посилання на сутність, не копію приватного контенту. */
import { sqliteTimestamp } from "./utils/datetime";

export const FAVORITE_KINDS = ["page", "user"] as const;
export type FavoriteKind = (typeof FAVORITE_KINDS)[number];
export interface FavoriteTarget {
  kind: FavoriteKind;
  targetId: number;
}
export interface FavoriteItem extends FavoriteTarget {
  title: string;
  href: string | null;
  /** Обкладинка сторінки; `null` — рядок показує знак замість фото. */
  photoUrl: string | null;
  /** Коли додали (`favorites.created_at`); `null` — дата невідома. */
  savedAt: string | null;
}
export interface FavoritesResponse {
  ok: boolean;
  items: FavoriteItem[];
}

/** Порядок списку обраного — **два вибори**, а не один «правильний». */
export const FAVORITE_SORTS = ["date", "name"] as const;
export type FavoriteSort = (typeof FAVORITE_SORTS)[number];

/**
 * Список обраного в обраному порядку: дата — найновіше першим, назва — за
 * абеткою. Обидва порядки мають **другий ключ** (назва й дата відповідно):
 * інакше записи з тією самою датою мінялись місцями від кожного рендера.
 */
export function sortFavorites(items: readonly FavoriteItem[], sort: FavoriteSort): FavoriteItem[] {
  const byName = (a: FavoriteItem, b: FavoriteItem) => a.title.localeCompare(b.title, "uk");
  const byDate = (a: FavoriteItem, b: FavoriteItem) =>
    sqliteTimestamp(b.savedAt ?? "") - sqliteTimestamp(a.savedAt ?? "");
  return [...items].sort(
    sort === "name"
      ? (a, b) => byName(a, b) || byDate(a, b)
      : (a, b) => byDate(a, b) || byName(a, b),
  );
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
