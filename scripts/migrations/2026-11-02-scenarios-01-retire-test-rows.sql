-- ═════════════════════════════════════════════════════════════════════════════
-- Прибрати з `scenarios` рядки, які не є сторінками
--
-- Що відбулося. `scenarios` — одна таблиця на дві речі: сторінку вебу
-- (`page_data`, `template_key`) і застаріле меню Telegram-бота (`caption_top`,
-- `buttons`, `rich_data`). Меню писалися до платформи й лишилися в базі: у них
-- немає `page_data`, тобто **сторінки за ними немає** — веб за такою адресою
-- не покаже нічого, крім фолбека.
--
-- Чому саме ці рядки. Критерій один: `page_data` порожній **і** адреса не
-- веде нікуди, крім старої кнопки. Залишаються всі сторінки: дослідження
-- (лендінг і 12 статей), два магазини, аналіз дат і сторінки, які ще треба
-- перевести на шаблон (`main`, `evgen-mitchenko`).
--
-- Що з корисного було в них. Кнопки старих меню (`allbots`, `mymedia*`,
-- `nastya`, `bjj`, `land-bohdanivka`) ведуть на фото в R2 і теки Google Drive —
-- самі об'єкти лишаються на місці, зникає лише рядок-меню. `richtest*`,
-- `test*`, `wwwuabot*`, `aaa`, `platform`, `WWWUABot` — проби й порожні
-- заготовки (`page_data` з «Заголовок сайдбар» і «Вкладка 1»).
--
-- Чому не DELETE без сліду. Ті самі рядки копіюються в
-- `scenarios_legacy_20261102` (як `scenarios_legacy_20260914` до них): рядок,
-- на який хтось таки посилається зі старого чату в Telegram, можна повернути
-- одним INSERT … SELECT. Звіт «до» нижче називає рядки, а не лише кількість.
--
-- Далі два прибирання: `users.active_scenario` міг указувати на видалене меню
-- (`nastya`), і такий стан лишає людину в екрані, якого більше немає.
--
-- Ідемпотентна: повторний запуск додає 0 рядків і видаляє 0 рядків.
--
-- Запуск (з кореня репозиторію, див. `docs/D1_OPS.md`):
--   npx wrangler d1 execute wwwuabot-db-dev --remote \
--     --config api-dev/wrangler.toml \
--     --file scripts/migrations/2026-11-02-scenarios-01-retire-test-rows.sql
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS scenarios_legacy_20261102 AS
SELECT * FROM scenarios WHERE 0;

INSERT OR REPLACE INTO scenarios_legacy_20261102
SELECT * FROM scenarios
WHERE id IN (1, 2, 3, 4, 5, 20, 22, 23, 25, 26, 27, 28, 29, 30, 31, 32, 33,
             35, 36, 37, 38, 39, 40, 41, 42, 45);

-- Звіт «до»: що саме зникає з `scenarios` — адреса, назва, чи була сторінка.
SELECT id, slug, title, length(COALESCE(page_data, '')) AS page_bytes
FROM scenarios
WHERE id IN (1, 2, 3, 4, 5, 20, 22, 23, 25, 26, 27, 28, 29, 30, 31, 32, 33,
             35, 36, 37, 38, 39, 40, 41, 42, 45)
ORDER BY id;

DELETE FROM scenarios
WHERE id IN (1, 2, 3, 4, 5, 20, 22, 23, 25, 26, 27, 28, 29, 30, 31, 32, 33,
             35, 36, 37, 38, 39, 40, 41, 42, 45);

UPDATE users
SET active_scenario = NULL
WHERE active_scenario IS NOT NULL
  AND active_scenario NOT IN (SELECT slug FROM scenarios);
