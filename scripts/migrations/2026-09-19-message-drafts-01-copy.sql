-- ═════════════════════════════════════════════════════════════════════════════
-- Міграція `message_drafts` — крок 1 з 2: копія в нову таблицю.
--
-- НАВІЩО. Чернетка була слотом на пару людей: `UNIQUE (owner_id, peer_id)` і
-- `peer_id NOT NULL`. Через це друга збережена чернетка тому самому адресатові
-- **тихо переписувала першу**, а чернетка без адресата була неможлива взагалі
-- (а вона потрібна: текст уже написано, «кому» ще не вирішено).
--
-- ЧОМУ НЕ `ensureTables`. Він уміє тільки `CREATE TABLE IF NOT EXISTS` і
-- `ALTER TABLE … ADD COLUMN`: прибрати `UNIQUE` чи послабити `NOT NULL` на
-- наявній таблиці SQLite не вміє, тож схема мовчки лишилась би старою (саме так
-- уже було з `scenarios`). Тому — окремий крок, як і описано в `docs/DATA_MODEL.md`.
--
-- ПОРЯДОК ВИКОНАННЯ: спершу цей файл, потім `-02-swap.sql`, потім деплой
-- `api-dev`. Старий код між кроками працює: він пише в ту саму таблицю за
-- парою, а копія на це не впливає.
--
-- ЩО ЦЕЙ ФАЙЛ РОБИТЬ: **тільки створює й додає**. Наявні рядки не змінюються й
-- не видаляються — переносяться як є, **разом із номерами** (`id`), щоб для
-- клієнта не змінилось нічого.
--
-- ЩО ПРОПУСКАЄТЬСЯ: нічого. У старій таблиці всі рядки мають адресата
-- (`peer_id NOT NULL`), а новій це теж припустимо. Перевірка в кінці друкує
-- обидва числа — якщо вони розійдуться, копіювати щось не дало (наприклад,
-- повторний запуск посеред роботи), і swap робити не можна.
--
-- ІДЕМПОТЕНТНІСТЬ: повторний запуск нічого не дублює — рядок з таким `id`, який
-- уже є в новій таблиці, не вставляється вдруге.
--
-- `DROP INDEX` тут — **не видалення даних**: індекс нічого не зберігає. Але ім'я
-- індексу в SQLite глобальне для бази, тож старий `idx_drafts_owner` лишився б
-- зайнятим на легасі-таблиці й будь-який однойменний `CREATE INDEX IF NOT
-- EXISTS` був би **порожньою дією** — та сама пастка, через яку колись
-- `site_pages` забрала ім'я `idx_pages_slug`.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "message_drafts_new" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  peer_id INTEGER,
  body TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO "message_drafts_new" (id, owner_id, peer_id, body, created_at, updated_at)
SELECT id, owner_id, peer_id, body, COALESCE(updated_at, datetime('now')), COALESCE(updated_at, datetime('now'))
  FROM "message_drafts"
 WHERE NOT EXISTS (SELECT 1 FROM "message_drafts_new" n WHERE n.id = "message_drafts".id);

DROP INDEX IF EXISTS "idx_drafts_owner";

-- Звіт: скількох перенесено.
SELECT (SELECT COUNT(*) FROM "message_drafts") AS у_старій,
       (SELECT COUNT(*) FROM "message_drafts_new") AS у_новій;
