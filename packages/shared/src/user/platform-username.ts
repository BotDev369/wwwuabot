/**
 * Ім'я користувача **на платформі** (wwwuabot) — не Telegram `username`.
 *
 * Навіщо окреме правило. У людини в Telegram handle може бути відсутнім,
 * змінитись або бути зайнятим кимось іншим — і тоді в нас немає за що
 * зачепитись у продукті. Тому платформа має власне ім'я: його обирає сам
 * користувач, воно одне на всю платформу (`UNIQUE`) і саме його показує
 * профіль. Telegram `username` при цьому лишається як є — це дані Telegram,
 * а не наш ідентифікатор.
 *
 * Правило одне на всі поверхні: і TWA (сам користувач), і адмінка, і будь-який
 * майбутній бот. Тримаємо його тут, а не в контролері, бо друга копія
 * неминуче розійдеться з першою — а «валідне тут, невалідне там» це вже не
 * правило, а два різних правила. У показі ім'я йде з позначкою `#` (див.
 * `formatPlatformUsername`) — `@` лишається Telegram-юзернейму.
 *
 * @module @wwwuabot/shared/user/platform-username
 */

/** Мінімальна довжина імені на платформі. */
export const PLATFORM_USERNAME_MIN = 3;

/** Максимальна довжина імені на платформі. */
export const PLATFORM_USERNAME_MAX = 32;

/**
 * Імена, які не можна займати.
 *
 * Це не «заборонені слова», а ті, які платформа вже використовує як власні
 * (розділи, службові ролі) — інакше користувач з таким іменем виглядав би як
 * адміністрація, а посилання й звертання почали б плутатись.
 */
export const RESERVED_PLATFORM_USERNAMES = [
  "admin",
  "administrator",
  "bot",
  "help",
  "moderator",
  "root",
  "support",
  "system",
  "wwwuabot",
] as const;

/** Причина відмови. Код — для API, текст — для людини. */
export type PlatformUsernameError = "empty" | "too_short" | "too_long" | "bad_chars" | "reserved";

export interface PlatformUsernameRules {
  min: number;
  max: number;
}

/** Ті самі межі у вигляді, придатному для підпису поля в UI. */
export const PLATFORM_USERNAME_RULES: PlatformUsernameRules = {
  min: PLATFORM_USERNAME_MIN,
  max: PLATFORM_USERNAME_MAX,
};

/** Текст відмови — один, щоб UI і API не розповідали різне. */
export const PLATFORM_USERNAME_MESSAGES: Record<PlatformUsernameError, string> = {
  empty: "Введіть ім'я",
  too_short: `Не коротше ${PLATFORM_USERNAME_MIN} символів`,
  too_long: `Не довше ${PLATFORM_USERNAME_MAX} символів`,
  bad_chars: "Можна латинські літери, цифри та підкреслення, і починати з літери",
  reserved: "Це ім'я зайняте платформою",
};

export type PlatformUsernameResult =
  { ok: true; value: string } | { ok: false; error: PlatformUsernameError; message: string };

/**
 * Зводить введене до канонічного вигляду: без позначки, без пробілів по краях,
 * у нижньому регістрі. Саме так воно й зберігається — тому порівняння в базі
 * не потребує `COLLATE NOCASE`, а `#Name` і `name` — це одне й те саме ім'я,
 * а не два різних рядки, за які потім довелось би битись.
 *
 * Приймаються обидві позначки: людина, яка звикла до `@`, вписує його замість
 * `#`, і відмовити їй через зайвий знак було б причіпкою, а не правилом.
 */
export function normalizePlatformUsername(raw: string): string {
  return raw
    .trim()
    .replace(/^[@#]+/, "")
    .toLowerCase();
}

/** Перевіряє й канонізує ім'я. Ніколи не кидає виняток. */
export function validatePlatformUsername(raw: string): PlatformUsernameResult {
  const value = normalizePlatformUsername(raw ?? "");

  if (!value) {
    return { ok: false, error: "empty", message: PLATFORM_USERNAME_MESSAGES.empty };
  }
  if (value.length < PLATFORM_USERNAME_MIN) {
    return { ok: false, error: "too_short", message: PLATFORM_USERNAME_MESSAGES.too_short };
  }
  if (value.length > PLATFORM_USERNAME_MAX) {
    return { ok: false, error: "too_long", message: PLATFORM_USERNAME_MESSAGES.too_long };
  }
  if (!/^[a-z][a-z0-9_]*$/.test(value) || value.endsWith("_") || value.includes("__")) {
    return { ok: false, error: "bad_chars", message: PLATFORM_USERNAME_MESSAGES.bad_chars };
  }
  if ((RESERVED_PLATFORM_USERNAMES as readonly string[]).includes(value)) {
    return { ok: false, error: "reserved", message: PLATFORM_USERNAME_MESSAGES.reserved };
  }

  return { ok: true, value };
}

/**
 * Показ імені в UI: `#name`, або `undefined`, якщо імені ще немає.
 *
 * **Позначка не косметична.** `@` — це синтаксис Telegram: клієнт робить із
 * `@слово` посилання на телеграм-акаунт, тож «@karas» вело б людину до
 * незнайомця. Ім'я на платформі — наше, і позначка в нього своя, `#`. Одна
 * позначка на один факт: у рядку профілю видно одразу, що `#karas` — це тут, а
 * `@sergiy` — у Telegram (`peerLabel` тримає те саме правило для чужих імен).
 */
export function formatPlatformUsername(value: string | null | undefined): string | undefined {
  const name = normalizePlatformUsername(value ?? "");
  return name ? `#${name}` : undefined;
}
