/**
 * Sites — схема таблиць.
 *
 * Тут більше немає DDL: `sites`, `site_pages` і `templates` оголошені в реєстрі
 * (`@wwwuabot/shared/database/tables`), як і решта таблиць проєкту. Цей модуль
 * лишається точкою входу для домену сайтів — його кличе кожна публічна функція
 * сервісу, — щоб імпорти в решті модулів не змінювались.
 *
 * Чому реєстр, а не «авто-міграція замість shared» (`AGENTS.md` §7):
 * `withAutoMigrate` додає колонки до наявної таблиці, а тут потрібне створення
 * самої таблиці при першому зверненні. І те, і те тепер в одному місці.
 *
 * @module api-dev/src/services/sites/schema
 */

import { ensureTables } from "@wwwuabot/shared/database/tables";

/** Гарантує наявність всіх таблиць домену Sites. Ідемпотентна. */
export async function ensureSitesTables(db: D1Database): Promise<void> {
  await ensureTables(db, ["sites", "site_pages", "templates"]);
}
