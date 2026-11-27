/**
 * Проєкти (орендарі): формат ключа, його місце в deep link і ролі.
 *
 * Тенант — це проєкт клієнта, а не набір воркерів (D25). Ключ їде лише з
 * префіксом `p_`: у тому самому `start_param` живуть payload'и бота, і без
 * префікса вони ставали б «проєктом, якого немає».
 * @module @wwwuabot/shared/tenants
 */

/** Ключ головного проєкту: він є в кожній базі й описує платформу як вона є. */
export const DEFAULT_TENANT_KEY = "main";

/** Префікс ключа в deep link: `t.me/<бот>?startapp=p_<key>`. */
export const TENANT_START_PREFIX = "p_";

/**
 * Формат ключа: латиниця, цифри й дефіс, 2–32 символи.
 *
 * Перший символ — літера: ключ стає частиною адреси, і `1shop` читався б як
 * номер, а не як назва. Великі літери заборонені, бо адреса не мусить залежати
 * від регістру — нормалізацію робить `tenantKeyFromStartParam`.
 */
export const TENANT_KEY_RE = /^[a-z][a-z0-9-]{1,31}$/;

/** Роль людини в проєкті. */
export type TenantRole = "owner" | "member";

/** Усі ролі — одним списком, щоб перевірка й підписи не розходились. */
export const TENANT_ROLES: readonly TenantRole[] = ["owner", "member"];

/** Чи придатний рядок як ключ проєкту. */
export function isValidTenantKey(value: string): boolean {
  return TENANT_KEY_RE.test(value);
}

/** Ключ → те, що ставиться в `?startapp=`. */
export function tenantStartParam(key: string): string {
  return `${TENANT_START_PREFIX}${key}`;
}

/**
 * `start_param` → ключ проєкту, або `null`, якщо це не ключ.
 *
 * `null` — нормальний результат, а не помилка: у тому самому полі приходять
 * payload'и бота, і вони мусять іти своїм шляхом, а не відкривати «проєкт,
 * якого не існує» (404).
 */
export function tenantKeyFromStartParam(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw.startsWith(TENANT_START_PREFIX)) return null;

  const key = raw.slice(TENANT_START_PREFIX.length).trim().toLowerCase();
  return isValidTenantKey(key) ? key : null;
}

/** Чи є рядок роллю проєкту. */
export function isTenantRole(value: string): value is TenantRole {
  return (TENANT_ROLES as readonly string[]).includes(value);
}
