-- Записати в рядок головного екрана бота команду `/start`.
--
-- Що відбувалося. Головна — це сторінка з порожнім `slug` (`HOME_SLUG`,
-- адреса веб-кореня), тож у базі рядок /start виглядав порожнім: ні команди,
-- ні адреси. Питання «чим відкривається головний екран» не мало відповіді в
-- даних, хоч відповідь очевидна — `/start`.
--
-- Що тут. Колонка `bot_command` (її ж додає `ensureTables` із реєстру) і
-- заповнення для головної. Бот читає головну за цією командою
-- (`bot-dev/src/repositories/scenario.repository.ts`), а не за порожнім рядком.
--
-- Ідемпотентна: `ALTER` виконується один раз (повтор дасть «duplicate column» —
-- це очікувано й безпечно пропустити), `UPDATE` чіпає лише рядок без команди.

ALTER TABLE "scenarios" ADD COLUMN bot_command TEXT;

UPDATE "scenarios"
   SET bot_command = '/start', updated_at = datetime('now')
 WHERE trim(slug) = ''
   AND (bot_command IS NULL OR trim(bot_command) = '');
