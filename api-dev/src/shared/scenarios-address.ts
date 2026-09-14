/**
 * Адресація рядка `scenarios` у портальному CRUD.
 *
 * У рядка дві назви, і вони різні за роллю:
 *
 * | Назва | Роль | Змінюється |
 * |---|---|---|
 * | `id` (номер) | ідентичність | ніколи |
 * | `slug` (адреса) | за нею ходять веб і бот | так, для цього номер і з'явився |
 *
 * Тому оновлення шукає рядок **за номером**, а адреса в тому ж запиті — це вже
 * нове значення, а не ключ пошуку. Інакше перейменування виглядало б як
 * «рядок не знайдено» або, гірше, створювало б другий рядок.
 *
 * Адреса лишається робочою там, де номера немає: у посиланні, у вкладці
 * «Поділитись», у зовнішньому виклику.
 *
 * @module api-dev/src/shared/scenarios-address
 */

import { isValidSlug, normalizeSlug } from "@wwwuabot/shared/content";
import { declaredColumns } from "@wwwuabot/shared/database/ensure-tables";
import { tableDefinition } from "@wwwuabot/shared/database/tables";

/**
 * Поля, які клієнт не пише.
 *
 * `id` видає база; `created_at` / `updated_at` ставить сервер. `slug` тут немає
 * навмисно — його редагують, і саме тому він не «службове» поле.
 */
const SERVER_FIELDS = new Set(["id", "created_at", "updated_at"]);

/**
 * Колонки таблиці — **з реєстру**, а не з тіла запиту.
 *
 * Ім'я колонки підставляється в SQL, тому список мусить бути замкненим.
 * Доти будь-який невідомий ключ (`id_extra`, друкарська помилка в назві поля)
 * доходив до `UPDATE` і обертався `no such column` — тобто **500 на помилку
 * клієнта**, і замість пояснення людина бачила «щось зламалось».
 */
const SCENARIOS = tableDefinition("scenarios");
const COLUMNS = new Set(SCENARIOS ? declaredColumns(SCENARIOS).map((column) => column.name) : []);

/** Ім'я колонки проходить далі в SQL — тримаємо його алфавітно-цифровим. */
const SAFE_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/** Номер рядка з тіла запиту: `3`, `"3"`. Решта — «номера немає». */
export function readId(body: Record<string, unknown>): number | null {
  const raw = body.id;
  if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) return raw;
  if (typeof raw === "string" && /^[1-9][0-9]*$/.test(raw)) return Number(raw);
  return null;
}

/**
 * Адреса з тіла запиту, нормалізована й перевірена.
 *
 * `null` — адреси немає або вона невалідна. Порожній рядок — **валідна**
 * адреса: це головна сторінка, і плутати її з «поля немає» не можна.
 */
export function readSlug(body: Record<string, unknown>): string | null {
  if (typeof body.slug !== "string") return null;
  const slug = normalizeSlug(body.slug);
  return isValidSlug(slug) ? slug : null;
}

/**
 * Нова адреса для перейменування.
 *
 * `undefined` — поле не передавали (адреса та сама); `null` — передали, але
 * вона невалідна (виклик мусить відповісти 400).
 */
export function readNextSlug(body: Record<string, unknown>): string | null | undefined {
  if (!("slug" in body)) return undefined;
  return typeof body.slug === "string" ? readSlug(body) : null;
}

/** Колонка й значення для пошуку рядка: спершу номер, далі адреса. */
export interface RowFilter {
  column: "id" | "slug";
  value: number | string;
}

/** Умова пошуку рядка; `null` — у запиті немає ні номера, ні адреси. */
export function rowFilter(body: Record<string, unknown>): RowFilter | null {
  const id = readId(body);
  if (id !== null) return { column: "id", value: id };
  const slug = readSlug(body);
  return slug === null ? null : { column: "slug", value: slug };
}

/**
 * Колонки, які справді пишуться.
 *
 * Об'єкти серіалізуються в JSON (у D1 вони лежать рядками), порожній рядок
 * стає `NULL` — так «поле очистили» відрізняється від «поле лишили порожнім»
 * при створенні.
 */
export function filterFields(body: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (SERVER_FIELDS.has(key) || key === "slug") continue;
    if (!SAFE_RE.test(key) || !COLUMNS.has(key)) continue;
    fields[key] =
      value !== null && typeof value === "object"
        ? JSON.stringify(value)
        : value === ""
          ? null
          : value;
  }
  return fields;
}

/** Чи це спроба зайняти чужу адресу. */
export function isSlugConflict(error: unknown): boolean {
  return error instanceof Error && /UNIQUE constraint failed: scenarios\.slug/.test(error.message);
}
