/**
 * @wwwuabot/ui/hub — список пунктів, у кожного з яких **дві дії**.
 *
 * Підключення в оболонці:
 *
 *   import { HubList } from "@wwwuabot/ui/hub";
 *   <HubList items={items} layout={layout} />
 *
 * Склад пунктів — свій у кожної оболонки (як у футера й меню), сама розмітка
 * пункту, стан заглушки й імена дій — спільні. Перший уживач — хаб «Створити»
 * платформи: екран, куди веде «+» у футері.
 *
 * @module @wwwuabot/ui/hub
 */

export { HubList } from "./HubList";
export type { HubAction, HubItem, HubListProps } from "./types";
