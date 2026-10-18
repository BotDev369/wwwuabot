-- ═════════════════════════════════════════════════════════════════════════════
-- Міграція `tracker_entries` — крок 1 з 2: копія в нову таблицю.
--
-- НАВІЩО. Стара модель — «один день = один рядок»: `UNIQUE (tracker_id, day)` і
-- upsert. Через це другий запис того самого дня **тихо переписував перший**, а
-- мірку, яку ведуть кілька разів на день (вода, перекус, витрати), неможливо
-- було записати вдруге взагалі. Тепер рядок — це **дотик**: день, число, нотатка
-- й момент запису (`logged_at`, із секундами), а день у звіті — їх сума.
--
-- ЧОМУ НЕ `ensureTables`. Він уміє `CREATE TABLE IF NOT EXISTS` і
-- `ALTER TABLE … ADD COLUMN`; прибрати `UNIQUE` з наявної таблиці SQLite не вміє,
-- тож схема мовчки лишилась би старою — і друга вода того самого дня падала б
-- із constraint. Тому окремий крок, як описано в `docs/D1_OPS.md`.
--
-- ПОРЯДОК ВИКОНАННЯ: спершу цей файл, потім `-02-swap.sql`, потім деплой
-- `api-dev`. Старий код між кроками працює: він пише upsert-ом у ту саму
-- таблицю, а копія на це не впливає.
--
-- ЩО ЦЕЙ ФАЙЛ РОБИТЬ: **тільки створює й додає**. Наявні рядки не змінюються й
-- не видаляються — переносяться як є, разом із номерами (`id`), щоб для клієнта
-- не змінилось нічого.
--
-- ЩО ПРОПУСКАЄТЬСЯ: нічого. У старій таблиці кожен рядок — це останній запис
-- свого дня, і він лишається одним дотиком. Момент дотика беремо з `updated_at`
-- (колонка, яку старий код оновлював при кожному збереженні) — окремого часу
-- першого дотику стара схема не зберігала.
--
-- ІДЕМПОТЕНТНІСТЬ: повторний запуск нічого не дублює — рядок з таким `id`, який
-- уже є в новій таблиці, не вставляється вдруге.
--
-- `DROP INDEX` тут — **не видалення даних**: індекс нічого не зберігає. Але ім'я
-- індексу в SQLite глобальне для бази, тож старі `idx_tracker_entries_*`
-- лишилися б зайнятими на легасі-таблиці й однаковий `CREATE INDEX IF NOT
-- EXISTS` у кроці 2 був би **порожньою дією**.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "tracker_entries_new" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tracker_id INTEGER NOT NULL,
  owner_id TEXT NOT NULL,
  day TEXT NOT NULL,
  value REAL NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  logged_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO "tracker_entries_new" (id, tracker_id, owner_id, day, value, note, logged_at, updated_at)
SELECT id, tracker_id, owner_id, day, value, COALESCE(note, ''),
       COALESCE(updated_at, datetime('now')),
       COALESCE(updated_at, datetime('now'))
  FROM "tracker_entries"
 WHERE NOT EXISTS (SELECT 1 FROM "tracker_entries_new" n WHERE n.id = "tracker_entries".id);

DROP INDEX IF EXISTS "idx_tracker_entries_tracker_day";
DROP INDEX IF EXISTS "idx_tracker_entries_owner_day";

-- Звіт: скількох перенесено. Числа мусять збігтися, інакше swap робити не можна.
SELECT (SELECT COUNT(*) FROM "tracker_entries") AS у_старій,
       (SELECT COUNT(*) FROM "tracker_entries_new") AS у_новій;
