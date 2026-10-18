-- ═════════════════════════════════════════════════════════════════════════════
-- Міграція `tracker_entries` — крок 2 з 2: заміна таблиці.
--
-- Запускати **тільки після** `2026-10-17-tracker-entries-01-copy.sql` і перевірки,
-- що звіт кроку 1 показав однакові числа:
--
--   SELECT COUNT(*) FROM tracker_entries;       -- стара
--   SELECT COUNT(*) FROM tracker_entries_new;   -- нова
--
-- Стара таблиця **не видаляється** — перейменовується в
-- `tracker_entries_legacy_20261017`: дані лишаються на місці, і крок оборотний
-- одним `ALTER TABLE … RENAME TO`. Прибрати легасі-таблицю — окремою командою з
-- Dashboard, коли власник переконається, що все на місці (Time Travel — 30 днів).
--
-- Індекси створюються тут, а не `ensureTables`: імена звільнились у кроці 1, і без
-- цих рядків нова таблиця лишилась би без них — а `CREATE INDEX IF NOT EXISTS` на
-- легасі-таблиці виглядав би як успіх, не роблячи нічого.
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE "tracker_entries" RENAME TO "tracker_entries_legacy_20261017";
ALTER TABLE "tracker_entries_new" RENAME TO "tracker_entries";

CREATE INDEX IF NOT EXISTS "idx_tracker_entries_tracker_day" ON "tracker_entries"(tracker_id, day);
CREATE INDEX IF NOT EXISTS "idx_tracker_entries_owner_day" ON "tracker_entries"(owner_id, day);

-- Звіт: нова таблиця на місці, номери й дні збережені.
SELECT COUNT(*) AS дотиків, MAX(id) AS найбільший_номер FROM "tracker_entries";
