/**
 * Головний проєкт для міграцій: той самий `main`, що й у коді.
 *
 * @module scripts/migrations/lib-tenants
 */

/** Мінімальна форма `tenants` для бекфілу: решта колонок додасть `ensureTables`. */
const CREATE_TENANTS = `CREATE TABLE IF NOT EXISTS "tenants" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`;

/** Номер головного проєкту; заводить його, якщо рядка немає. */
export function mainTenantId(db) {
  db.exec(CREATE_TENANTS);
  const existing = db.prepare("SELECT id FROM tenants WHERE key = 'main'").get();
  if (existing) return existing.id;
  db.prepare("INSERT INTO tenants (key, name) VALUES ('main', 'main')").run();
  return db.prepare("SELECT id FROM tenants WHERE key = 'main'").get().id;
}
