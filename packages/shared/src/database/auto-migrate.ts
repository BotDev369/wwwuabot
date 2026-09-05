/**
 * Визначає тип SQLite колонки на основі значення JavaScript.
 */
function inferSqliteType(value: unknown): "INTEGER" | "REAL" | "TEXT" {
  if (value === null || value === undefined) {
    return "TEXT"; // NULL значення → TEXT
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? "INTEGER" : "REAL";
  }
  // Все інше (string, object, boolean) → TEXT
  return "TEXT";
}

/**
 * Обгортка для запитів до БД.
 * Якщо запит падає через відсутню колонку — автоматично додає її
 * (визначаючи тип з значення) і повторює запит.
 *
 * @param db - Інстанс D1Database
 * @param fn - Функція, що виконує запит до БД
 * @param fieldsToCreate - Словник { fieldName: sampleValue } для визначення типу
 * @param tableName - НАЗВА ТАБЛИЦІ (обов'язковий параметр, без дефолтів)
 */
export async function withAutoMigrate<T>(
  db: D1Database,
  fn: () => Promise<T>,
  fieldsToCreate: Record<string, unknown>,
  tableName: string,
): Promise<T> {
  let lastError: unknown;
  let attempts = 0;
  const maxAttempts = Object.keys(fieldsToCreate).length + 1;

  while (attempts < maxAttempts) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      const msg = error instanceof Error ? error.message : String(error);

      // Шукаємо назву відсутньої колонки в помилці SQLite
      const match = msg.match(/no such column: (\w+)|has no column named (\w+)/);
      if (match) {
        const missingField = match[1] || match[2];
        const sampleValue = fieldsToCreate[missingField];
        if (sampleValue !== undefined) {
          const type = inferSqliteType(sampleValue);
          console.log(
            `[Auto-Migrate] Creating column: ${tableName}.${missingField} ${type} DEFAULT NULL`,
          );
          await db
            .prepare(`ALTER TABLE ${tableName} ADD COLUMN ${missingField} ${type} DEFAULT NULL`)
            .run();
          attempts++;
          continue; // Повторюємо спробу
        }
      }

      // Якщо помилка не про колонку — кидаємо далі
      throw error;
    }
  }

  throw lastError;
}
