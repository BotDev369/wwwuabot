-- ═════════════════════════════════════════════════════════════════════════════
-- Міграція `scenarios` — крок 2 з 2: заміна таблиці.
-- Запускати **тільки після** 2026-09-14-scenarios-01-copy.sql і перевірки:
--
--   SELECT COUNT(*) FROM scenarios;          -- стара (46)
--   SELECT COUNT(*) FROM scenarios_new;      -- нова (скільки перенеслось)
--   SELECT slug FROM scenarios_new ORDER BY slug;
--
-- Стара таблиця **не видаляється** — перейменовується в `scenarios_legacy_
-- 20260914`. Це бекофісний хід, а не нігілізм: дані лишаються на місці, і
-- крок оборотний одним `ALTER TABLE … RENAME TO`. Коли власник переконається,
-- що все на місці, легасі-таблиця прибирається однією командою з Dashboard
-- (D1 тримає Time Travel на 30 днів).
--
-- `DROP INDEX` тут — **не видалення даних**: індекс нічого не зберігає. Але
-- його ім'я глобальне для бази, тому старі `idx_scenarios_*` лишились би
-- зайнятими на легасі-таблиці, і будь-який майбутній однойменний
-- `CREATE UNIQUE INDEX IF NOT EXISTS` був би **порожньою дією** — саме та
-- пастка, через яку колись `site_pages` забрала ім'я `idx_pages_slug`.
-- Унікальність нової таблиці тримає `UNIQUE` у самому DDL, тож іменований
-- індекс їй не потрібен.
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE "scenarios" RENAME TO "scenarios_legacy_20260914";
ALTER TABLE "scenarios_new" RENAME TO "scenarios";

DROP INDEX IF EXISTS "idx_scenarios_slug";
DROP INDEX IF EXISTS "idx_scenarios_web_slug";
DROP INDEX IF EXISTS "idx_scenarios_is_active";
