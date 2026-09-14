/**
 * user-edit-helpers.ts — чисті перетворення рядка `users` у поля форми й назад.
 * Тут немає стану, тому це можна перевіряти тестами, не піднімаючи React.
 */

import type { UserRow } from "../../../shared/api/users.api";

/**
 * Поля, які форма редагує **типізовано**. Усе решта — «додаткові поля»
 * (сирий JSON), і вони не мусять зникати при збереженні.
 */
const TYPED_FIELDS = new Set([
  "user_id",
  "first_name",
  "last_name",
  "username",
  "language",
  "created_at",
  "is_blocked",
  "role",
  "tariff",
  "status",
  "discount",
  "permissions",
]);

/** `permissions` лежить або як JSON-масив, або як список через кому. */
export function parsePermissions(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

/** Рядок користувача → «додаткові поля» як текст (щоб не втратити нічого зайвого). */
export function splitExtraFields(row: UserRow): Record<string, string> {
  const extra: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    if (TYPED_FIELDS.has(key)) continue;
    if (value === null || value === undefined) extra[key] = "";
    else if (typeof value === "object") extra[key] = JSON.stringify(value, null, 2);
    else extra[key] = String(value);
  }
  return extra;
}

/** Тіло PATCH: типізовані поля + додаткові (порожній текст — це `null`, а не `""`). */
export function buildUserPatch({
  role,
  tariff,
  status,
  discount,
  permissions,
  extraFields,
}: {
  role: string;
  tariff: string;
  status: string;
  discount: number;
  permissions: string[];
  extraFields: Record<string, string>;
}): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    role,
    tariff,
    status,
    discount,
    permissions: JSON.stringify(permissions),
  };
  for (const [key, value] of Object.entries(extraFields)) {
    if (value.startsWith("{") || value.startsWith("[")) {
      try {
        patch[key] = JSON.parse(value);
      } catch {
        patch[key] = value;
      }
    } else if (value === "") {
      patch[key] = null;
    } else {
      patch[key] = value;
    }
  }
  return patch;
}
