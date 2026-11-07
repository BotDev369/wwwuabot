-- Глядачі приватної сторінки: кому автор відкрив її окремо від публічності.
--
-- JSON-масив Telegram-id у колонці `viewer_ids` — той самий прийом, що
-- `admin_ids`: окрема ознака рядка, а не таблиця. Точний склад перевіряє
-- `pageVisibleTo` (`packages/shared/src/pages/access.ts`), бо SQL про вміст
-- JSON нічого не знає.
--
-- `ensureTables` додає колонку сам на першому запиті; цей файл лишає слід у
-- міграціях і дає ту саму зміну базі, до якої ще не дійшов воркер.
ALTER TABLE scenarios ADD COLUMN viewer_ids TEXT;
