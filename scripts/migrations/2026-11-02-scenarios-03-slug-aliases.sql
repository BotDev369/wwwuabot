-- ═════════════════════════════════════════════════════════════════════════════
-- Старі адреси сторінок: alias → поточна адреса
--
-- Навіщо. Адреса сторінки — контракт: вона вже пішла в чат, у кнопку бота, у
-- закладку. Доти перейменування робило з неї 404, і дізнатись про це було ні
-- чим. Тепер переїзд лишає рядок у `slug_aliases`, а за ним веде `301`
-- (`web-platform-dev/src/worker.ts` → `/api/public/redirect`).
--
-- Схема — у реєстрі (`packages/shared/src/database/tables.ts`), тож
-- `ensureTables()` створить таблицю й сама; ця міграція потрібна, щоб її
-- побачила вже наявна база без деплою коду.
--
-- Таблиця порожня навмисно: історію адрес пишуть перейменування (сервіс) і
-- міграції контенту, а не вигадані рядки.
--
-- Запуск:
--   npx wrangler d1 execute wwwuabot-db-dev --remote \
--     --config api-dev/wrangler.toml \
--     --file scripts/migrations/2026-11-02-scenarios-03-slug-aliases.sql
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS slug_aliases (
  alias TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Звіт: таблиця є, рядків поки немає.
SELECT COUNT(*) AS aliases FROM slug_aliases;
