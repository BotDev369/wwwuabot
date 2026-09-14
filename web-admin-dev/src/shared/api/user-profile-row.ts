/**
 * Рядок `users` → спільний `UserProfileData`.
 *
 * Чисте перетворення без стану й без запитів: адмінка бачить ті самі поля, що
 * й користувач у TWA, але з рядка бази. Одне місце для цього правила — інакше
 * «профіль користувача» в адмінці існував би у двох копіях і розповідав різне.
 *
 * @module web-admin-dev/src/shared/api/user-profile-row
 */

import type { UserProfileData } from "@wwwuabot/shared";
import type { UserRow } from "./users.api";

/**
 * `telegram_json` з рядка `users` → об'єкт. Пише його `bot-dev` (усе, що
 * Telegram віддав про людину); пошкоджений або порожній JSON — це `null`, а не
 * виняток: картка має показати решту даних, а не впасти.
 */
export function parseTelegramJson(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** `permissions` — JSON-масив; старі рядки писали його через кому. */
function parsePermissions(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

/*
 * `platform_username` і `telegram_json` не «додаткові»: перше має власний блок
 * угорі картки, друге — розділ «Дані від Telegram», тому в сирому переліку
 * вони були б третім і четвертим показом того самого.
 */
const SKIP_FIELDS = new Set([
  "user_id",
  "first_name",
  "last_name",
  "username",
  "language",
  "role",
  "tariff",
  "status",
  "discount",
  "permissions",
  "is_blocked",
  "platform_username",
  "telegram_json",
  "created_at",
  "updated_at",
]);

export function rowToProfile(row: UserRow): UserProfileData {
  const r = row as Record<string, unknown>;

  const rawFields: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(r)) {
    if (!SKIP_FIELDS.has(key) && val !== null && val !== undefined && val !== "") {
      rawFields[key] = val;
    }
  }

  return {
    id: r.user_id as number,
    firstName: r.first_name as string | null,
    lastName: r.last_name as string | null,
    username: r.username as string | null,
    platformUsername: (r.platform_username as string | null) ?? null,
    language: r.language as string | null,
    telegram: parseTelegramJson(r.telegram_json),
    role: r.role as string | null,
    tariff: r.tariff as string | null,
    status: r.status as string | null,
    discount: r.discount as number | null,
    permissions: parsePermissions(r.permissions),
    isBlocked: r.is_blocked as number | null,
    createdAt: r.created_at as string | null,
    updatedAt: r.updated_at as string | null,
    rawFields: Object.keys(rawFields).length > 0 ? rawFields : undefined,
  };
}
