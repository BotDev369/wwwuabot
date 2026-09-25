/**
 * JSON-колонка магазину → значення, з яким працюють правила.
 *
 * `images`, `attributes` і `contact` — це JSON у рядку бази (динамічний склад,
 * як `buttons` чи `page_data`). Розбір стоїть тут, а не в кожному сервісі: три
 * копії `try { JSON.parse }` розійшлися б на першій же правці, а різниця між
 * ними читалась би як різниця даних.
 *
 * **Зіпсоване значення — це не виняток, а порожнє.** Рядок, який не
 * розбирається, показується як «нічого не записано»: падати на ньому означало б
 * зробити один зіпсований рядок дверима, за які не пройти, а сторінка каталогу
 * мусить відкриватись.
 *
 * @module api-dev/src/services/shop/json
 */

export function readJsonColumn(raw: unknown): unknown {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}
