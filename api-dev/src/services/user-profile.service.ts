/**
 * Профіль користувача: читання всього, що про нього відомо, і запис **імені
 * на платформі**.
 *
 * **Чому окремий сервіс, а не методи `UsersService`.** Це два різні питання.
 * `UsersService` — це адмінський CRUD над рядком `users` (список, блокування,
 * bulk, повідомлення). Профіль — це **читання «все про мене»** плюс одна дія
 * самого користувача, і його читає не адмінка, а TWA. Змішавши їх, файл
 * `users.service.ts` переростає межу кристалевості (200 рядків — прапорець,
 * 400 — помилка гейта), і будь-яка правка в профілі ризикує зачепити
 * блокування чи bulk-операції.
 *
 * **Ідентичність тут не перевіряється.** `userId` приходить від контролера, і
 * тільки з підписаного Telegram `initData` (`shared/identity.ts`) — жодного
 * `?user_id=` чи заголовка. Інакше кожен читав би роль і тариф будь-кого.
 *
 * @module api-dev/src/services/user-profile.service
 */

import type { Env } from "../shared/types";
import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import { validatePlatformUsername } from "@wwwuabot/shared/user/platform-username";

/**
 * Усе, що Telegram віддав про людину, — як є.
 *
 * Не перелік полів: Telegram додає нові (`is_premium`, `added_to_menu`,
 * `allows_write_to_pm`, …), і жодне з них не мусить чекати на правку в коді,
 * щоб з'явитись у профілі. Людина має бачити те, що про неї насправді відомо.
 */
export type TelegramData = Record<string, unknown>;

/** Профіль користувача для платформи. */
export interface UserProfileDto {
  id: number;
  /** Ім'я та прізвище з Telegram. */
  firstName: string | null;
  lastName: string | null;
  /** Telegram-хендл (`@handle`) — те, що ми не обираємо. */
  username: string | null;
  /** Ім'я на платформі — те, що обирає сам користувач. */
  platformUsername: string | null;
  language: string | null;
  /** Дані Telegram, збережені ботом під час останнього звернення (може бути `null`). */
  telegram: TelegramData | null;
  role: string;
  tariff: string;
  status: string;
  discount: number;
  permissions: string[];
  isBlocked: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

/** Результат зміни імені: або нове ім'я, або **причина** відмови. */
export type SetPlatformUsernameResult =
  | { ok: true; platformUsername: string }
  | { ok: false; code: "invalid" | "taken" | "db"; message: string };

/** Колонки профілю — перелічені, а не `SELECT *`: `my_dates` важкий. */
const PROFILE_COLUMNS = `user_id, first_name, last_name, username, platform_username, language,
                        telegram_json, role, tariff, status, discount, permissions,
                        is_blocked, created_at, updated_at`;

/** Розбір `permissions`: у базі це JSON, але трапляється й список через кому. */
export function parsePermissions(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // не JSON — нижче розберемо як список через кому
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Розбір `telegram_json`. Незрозумілий вміст не ламає профіль — просто відсутній. */
export function parseTelegramData(raw: unknown): TelegramData | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as TelegramData;
    }
  } catch {
    return null;
  }
  return null;
}

export class UserProfileService {
  constructor(private env: Env) {}

  /** Гарантує наявність колонок профілю в `users` (ідемпотентно). */
  private async ensureSchema(): Promise<void> {
    await ensureTables(this.env.DB, ["users"]);
  }

  /** Профіль користувача або `null`, якщо рядка немає. */
  async read(userId: number): Promise<UserProfileDto | null> {
    await this.ensureSchema();

    const row = await this.env.DB.prepare(`SELECT ${PROFILE_COLUMNS} FROM users WHERE user_id = ?`)
      .bind(userId)
      .first<Record<string, unknown>>();

    if (!row) return null;

    return {
      id: Number(row.user_id),
      firstName: (row.first_name as string) ?? null,
      lastName: (row.last_name as string) ?? null,
      username: (row.username as string) ?? null,
      platformUsername: (row.platform_username as string) ?? null,
      language: (row.language as string) ?? null,
      telegram: parseTelegramData(row.telegram_json),
      role: (row.role as string) ?? "user",
      tariff: (row.tariff as string) ?? "free",
      status: (row.status as string) ?? "active",
      discount: Number(row.discount ?? 0),
      permissions: parsePermissions(row.permissions),
      isBlocked: Number(row.is_blocked ?? 0) === 1,
      createdAt: (row.created_at as string) ?? null,
      updatedAt: (row.updated_at as string) ?? null,
    };
  }

  /**
   * Змінює ім'я на платформі поточного користувача.
   *
   * Перевірка «вільно чи зайнято» тут, а не через `UNIQUE`-індекс: колонка
   * додається ідемпотентно (`ensureTables`), а іменований унікальний індекс у
   * SQLite має **глобальне** ім'я — однойменний на іншій таблиці був би
   * порожньою дією без помилки. Тому унікальність тримає сам запит, і він же
   * каже людині причину («зайняте»), чого `UNIQUE` не вміє.
   */
  async setPlatformUsername(userId: number, raw: string): Promise<SetPlatformUsernameResult> {
    const validated = validatePlatformUsername(raw);
    if (!validated.ok) {
      return { ok: false, code: "invalid", message: validated.message };
    }

    try {
      await this.ensureSchema();

      const taken = await this.env.DB.prepare(
        "SELECT user_id FROM users WHERE platform_username = ?",
      )
        .bind(validated.value)
        .first<{ user_id: number }>();

      if (taken && Number(taken.user_id) !== userId) {
        return { ok: false, code: "taken", message: "Це ім'я вже зайняте" };
      }

      await this.env.DB.prepare(
        "UPDATE users SET platform_username = ?, updated_at = ? WHERE user_id = ?",
      )
        .bind(validated.value, formatSqliteDatetime(), userId)
        .run();

      return { ok: true, platformUsername: validated.value };
    } catch {
      return { ok: false, code: "db", message: "Не вдалося зберегти ім'я" };
    }
  }
}
