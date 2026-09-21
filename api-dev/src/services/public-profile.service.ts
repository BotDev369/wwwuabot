/**
 * Публічний профіль: **що про людину бачать інші** — і хто саме видно в Просторі.
 *
 * **Чому окремий сервіс, а не ще кілька методів `UserProfileService`.** Той
 * читає «все про мене» для власного екрана; цей відповідає на протилежне
 * питання — «що з цього показувати **комусь**». Друге питання безпечніше
 * тримати окремо: тут кожен запит до `users` звузиний списком колонок без
 * Telegram-даних, і жодне поле не їде назовні без перевірки набору відкритих.
 *
 * **Фільтр видимості стоїть у запиті й у побудові подання, а не в розмітці.**
 * Приватний профіль не можна дістати ні списком, ні за номером — інакше
 * перемикач «публічний» був би кнопкою, яка бреше (AGENTS.md §7).
 *
 * **Заблокованих у Просторі немає.** `is_blocked = 1` — це рішення платформи
 * про людину, і воно не про те, що людина сховала: показувати такий профіль
 * у відкритій стрічці означало б скасовувати блокування одним прапорцем.
 *
 * @module api-dev/src/services/public-profile.service
 */

import type { Env } from "../shared/types";
import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import {
  isProfilePublic,
  parsePublicFields,
  publicProfileView,
  serializePublicFields,
  validateAbout,
  type AboutResult,
  type PublicProfile,
  type PublicProfileField,
  type PublicProfileSource,
} from "@wwwuabot/shared/user/public-profile";

/** Налаштування власного профілю — те, що людина бачить під перемикачами. */
export interface PublicProfileSettings {
  about: string;
  isPublic: boolean;
  /** Відкриті поля. Порожній список — свідоме «все закрито». */
  openFields: PublicProfileField[];
}

/** Скільки людей віддає стрічка Простору за раз і яка межа запиту. */
export const SPACE_PAGE_SIZE = 60;
const SPACE_PAGE_MAX = 100;

/** Колонки **власного** профілю: без Telegram — щоб витік не залежав від уваги. */
const OWN_COLUMNS = "about, profile_public, profile_public_fields";

/** Колонки публічного подання. `telegram_json` тут не згадано навмисно. */
const PUBLIC_COLUMNS = `user_id, platform_username, photo_url, about, role, tariff, status,
                        language, created_at, profile_public_fields`;

/** Відповідність колонки рядка `users` полю публічного подання. */
function toSource(row: Record<string, unknown>): PublicProfileSource {
  return {
    id: Number(row.user_id),
    platformUsername: (row.platform_username as string) ?? null,
    photoUrl: (row.photo_url as string) ?? null,
    about: (row.about as string) ?? null,
    role: (row.role as string) ?? null,
    tariff: (row.tariff as string) ?? null,
    status: (row.status as string) ?? null,
    language: (row.language as string) ?? null,
    createdAt: (row.created_at as string) ?? null,
  };
}

/** Скільки віддавати за запитом: сміття й перебір дають межі, а не помилку. */
export function clampSpaceLimit(raw: unknown): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return SPACE_PAGE_SIZE;
  return Math.min(Math.floor(value), SPACE_PAGE_MAX);
}

export class PublicProfileService {
  constructor(private env: Env) {}

  /** Гарантує наявність колонок публічності в `users` (ідемпотентно). */
  private async ensureSchema(): Promise<void> {
    await ensureTables(this.env.DB, ["users"]);
  }

  /** Налаштування власного профілю. Рядка немає — типове: ще нічого не обрано. */
  async readSettings(userId: number): Promise<PublicProfileSettings> {
    await this.ensureSchema();

    const row = await this.env.DB.prepare(`SELECT ${OWN_COLUMNS} FROM users WHERE user_id = ?`)
      .bind(userId)
      .first<Record<string, unknown>>();

    return {
      about: (row?.about as string) ?? "",
      isPublic: isProfilePublic(row?.profile_public),
      openFields: parsePublicFields(row?.profile_public_fields),
    };
  }

  /** «Про себе» поточного користувача. */
  async saveAbout(userId: number, raw: unknown): Promise<AboutResult> {
    const validated = validateAbout(raw);
    if (!validated.ok) return validated;

    try {
      await this.ensureSchema();
      await this.env.DB.prepare("UPDATE users SET about = ?, updated_at = ? WHERE user_id = ?")
        .bind(validated.value, formatSqliteDatetime(), userId)
        .run();
      return validated;
    } catch {
      return { ok: false, message: "Не вдалося зберегти" };
    }
  }

  /**
   * Публічність і набір відкритих полів — **одним записом**.
   *
   * Дві дії, а не дві правди: увімкнення профілю без набору лишило б у базі
   * порожнечу, яку кожен читач тлумачив би по-своєму. Коли `fields` не
   * передано (людина лише перемкнула прапорець), набір лишається тим, що вже
   * збережено.
   */
  async saveVisibility(
    userId: number,
    input: { isPublic: boolean; fields?: readonly string[] | undefined },
  ): Promise<PublicProfileSettings> {
    const current = await this.readSettings(userId);
    const openFields =
      input.fields === undefined ? current.openFields : parsePublicFields([...input.fields]);

    await this.env.DB.prepare(
      "UPDATE users SET profile_public = ?, profile_public_fields = ?, updated_at = ? WHERE user_id = ?",
    )
      .bind(
        input.isPublic ? 1 : 0,
        serializePublicFields(openFields),
        formatSqliteDatetime(),
        userId,
      )
      .run();

    return { ...current, isPublic: input.isPublic, openFields };
  }

  /** Люди, які самі відкрили свій профіль, — у порядку останньої зміни. */
  async listPublic(limit: unknown = SPACE_PAGE_SIZE): Promise<PublicProfile[]> {
    await this.ensureSchema();

    const rows = await this.env.DB.prepare(
      `SELECT ${PUBLIC_COLUMNS} FROM users
        WHERE profile_public = 1 AND is_blocked = 0
        ORDER BY updated_at DESC, user_id DESC
        LIMIT ?`,
    )
      .bind(clampSpaceLimit(limit))
      .all<Record<string, unknown>>();

    return (rows.results ?? []).map((row) =>
      publicProfileView(toSource(row), parsePublicFields(row.profile_public_fields)),
    );
  }

  /** Профіль однієї людини — або `null`, якщо вона закрита чи її немає. */
  async readPublic(userId: number): Promise<PublicProfile | null> {
    await this.ensureSchema();

    const row = await this.env.DB.prepare(
      `SELECT ${PUBLIC_COLUMNS} FROM users WHERE user_id = ? AND profile_public = 1 AND is_blocked = 0`,
    )
      .bind(userId)
      .first<Record<string, unknown>>();

    if (!row) return null;
    return publicProfileView(toSource(row), parsePublicFields(row.profile_public_fields));
  }
}
