/**
 * Публічний профіль — те, що про людину бачать **інші**.
 *
 * **Спільний модуль, бо правило одне на три питання:** що можна відкрити, що
 * відкрито за замовчуванням і як із рядка `users` виходить картка Простору.
 * Порізно фільтр на сервері й перемикачі на екрані розійшлися б — і приватне
 * поле поїхало б у відповідь API, хоч перемикач стояв би вимкненим.
 *
 * **Телеграму тут немає навмисно:** ці дані не наші (`AGENTS.md` §2), тож у
 * публічне подання не потрапляють ніколи — показуються лише дані платформи.
 *
 * **Типово відкрито — ім'я, фото й «Про себе»:** за цим людину впізнають у
 * стрічці; роль, тариф, статус, мова й дата — про стосунки з платформою, і їх
 * людина вмикає сама.
 *
 * @module @wwwuabot/shared/user/public-profile
 */

import { formatPlatformUsername } from "./platform-username";

/** Скільки символів уміщає «Про себе». Обмеження одне на клієнт і сервер. */
export const ABOUT_MAX_LENGTH = 900;

/**
 * Поля, які людина може відкрити іншим. Порядок — як на екрані: спершу те, що
 * впізнається, далі дані акаунта. Перемикачі будуються **з цього списку**, а не
 * з власної копії в розмітці, тож нове поле не забуде про себе ніде.
 */
export const PUBLIC_PROFILE_FIELDS = [
  "platformUsername",
  "photo",
  "about",
  "role",
  "tariff",
  "status",
  "language",
  "createdAt",
] as const;

export type PublicProfileField = (typeof PUBLIC_PROFILE_FIELDS)[number];

/** Підписи перемикачів — ті самі слова, що в картці профілю. */
export const PUBLIC_FIELD_LABELS: Record<PublicProfileField, string> = {
  platformUsername: "Ім'я на платформі",
  photo: "Фото",
  about: "Про себе",
  role: "Роль",
  tariff: "Тариф",
  status: "Статус",
  language: "Мова",
  createdAt: "З нами з",
};

/**
 * Що відкрито, поки людина нічого не чіпала. Порожній список і «нічого не
 * вирішено» — **різні** стани: відсутнє значення дає цей набір, `[]` лишається
 * `[]` (свідоме «все закрито»).
 */
export const DEFAULT_OPEN_FIELDS: readonly PublicProfileField[] = [
  "platformUsername",
  "photo",
  "about",
];

/** Чи це відоме поле (а не залишок від старішої версії у сховищі). */
export function isPublicProfileField(value: string): value is PublicProfileField {
  return (PUBLIC_PROFILE_FIELDS as readonly string[]).includes(value);
}

/**
 * Розбір збереженого набору: JSON-масив (як пише сервер) або список через кому
 * (колонка мягка, як `permissions`). Нерозібраний вміст дає **типове**, а не
 * «все закрито». Невідомі ключі відкидаються, порядок — канонічний, інакше
 * перемикачі стояли б так, як їх колись зберіг клієнт.
 */
export function parsePublicFields(raw: unknown): PublicProfileField[] {
  if (raw === null || raw === undefined) return [...DEFAULT_OPEN_FIELDS];

  let list: unknown = raw;
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return [...DEFAULT_OPEN_FIELDS];
    try {
      const parsed: unknown = JSON.parse(text);
      list = Array.isArray(parsed) ? parsed : text.split(",");
    } catch {
      list = text.split(",");
    }
  }
  if (!Array.isArray(list)) return [...DEFAULT_OPEN_FIELDS];

  const known = new Set(list.map((entry) => String(entry).trim()).filter(isPublicProfileField));
  return PUBLIC_PROFILE_FIELDS.filter((field) => known.has(field));
}

/** Запис набору — той самий JSON-масив, який читає `parsePublicFields`. */
export function serializePublicFields(fields: readonly string[]): string {
  const known = fields.filter(isPublicProfileField);
  return JSON.stringify(PUBLIC_PROFILE_FIELDS.filter((field) => known.includes(field)));
}

/** Прапорець публічності з рядка `users`: `1`, `"1"`, `true` — усе «так». */
export function isProfilePublic(raw: unknown): boolean {
  return raw === true || raw === 1 || raw === "1" || raw === "true";
}

/** Результат зміни «Про себе»: або новий текст, або **причина** відмови. */
export type AboutResult = { ok: true; value: string } | { ok: false; message: string };

/**
 * Перевірка «Про себе» — та сама, що на сервері (причина відмови приходить до
 * запиту). Порожній текст — законний стан: людина передумала розповідати.
 */
export function validateAbout(raw: unknown): AboutResult {
  if (raw === null || raw === undefined) return { ok: true, value: "" };
  if (typeof raw !== "string") return { ok: false, message: "Очікується текст" };

  const value = raw.trim();
  if (value.length > ABOUT_MAX_LENGTH) {
    return { ok: false, message: `Занадто довго: до ${ABOUT_MAX_LENGTH} символів` };
  }
  return { ok: true, value };
}

/**
 * Джерело для публічного подання — те, що сервіс дістав із рядка `users`.
 *
 * Окремий тип, а не `UserProfileData`: тут **немає** Telegram-полів, тож
 * випадково показати чуже `telegram_json` не вийде навіть у коді.
 */
export interface PublicProfileSource {
  id: number;
  platformUsername?: string | null;
  photoUrl?: string | null;
  about?: string | null;
  role?: string | null;
  tariff?: string | null;
  status?: string | null;
  language?: string | null;
  createdAt?: string | null;
}

/** Поля подання, які можна закрити: номер (`id`) — не дані, його не закривають. */
type TextField = Exclude<keyof PublicProfile, "id">;

/**
 * Те, що бачать інші: лише відкриті поля й лише ті, у яких щось є. Порожнє не
 * створює ключа взагалі — інакше `null` у відповіді означав би «поле є, але
 * порожнє», тобто витік того, що людина закрила. `id` лишається завжди: це
 * адреса картки, а не дані про людину.
 */
export function publicProfileView(
  source: PublicProfileSource,
  open: readonly PublicProfileField[],
): PublicProfile {
  const allowed = new Set<PublicProfileField>(open);
  const view: PublicProfile = { id: source.id };

  const put = (field: PublicProfileField, key: TextField, raw: unknown): void => {
    if (!allowed.has(field) || typeof raw !== "string") return;
    const value = raw.trim();
    if (value) view[key] = value;
  };

  put("platformUsername", "platformUsername", source.platformUsername);
  put("photo", "photoUrl", source.photoUrl);
  put("about", "about", source.about);
  put("role", "role", source.role);
  put("tariff", "tariff", source.tariff);
  put("status", "status", source.status);
  put("language", "language", source.language);
  put("createdAt", "createdAt", source.createdAt);

  return view;
}

/** Картка людини в Просторі — те саме подання, що віддає `/api/space/users`. */
export interface PublicProfile {
  id: number;
  platformUsername?: string;
  photoUrl?: string;
  about?: string;
  role?: string;
  tariff?: string;
  status?: string;
  language?: string;
  createdAt?: string;
}

/** Чи порожня картка: відкрито все, але заповнено — нічого. */
export function isEmptyPublicProfile(profile: PublicProfile): boolean {
  return Object.keys(profile).every((key) => key === "id");
}

/** Ім'я людини для показу: `#ім'я` — або `undefined`, якщо його закрито. */
export function publicProfileLabel(profile: PublicProfile): string | undefined {
  return formatPlatformUsername(profile.platformUsername);
}
