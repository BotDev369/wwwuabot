/**
 * Українські форми множини для ігор — **слова ігор, правило спільне.**
 *
 * Сама функція живе в `@wwwuabot/shared/utils/plural`: її вже потрібно було
 * не тільки іграм, а й магазину та самооцінці, тож три копії селектора —
 * це три можливі правди. Тут лишаються тільки форми, які є словами ігор.
 *
 * @module web-platform-dev/src/pages/games/plural
 */

import { plural, type PluralForms } from "@wwwuabot/shared/utils/plural";

export { plural };
export type { PluralForms };

/** «1 спроба», «2 спроби», «5 спроб» — називний відмінок. */
export const ATTEMPTS: PluralForms = ["спроба", "спроби", "спроб"];

/** «за 1 спробу», «за 2 спроби», «за 5 спроб» — знахідний. */
export const ATTEMPTS_ACCUSATIVE: PluralForms = ["спробу", "спроби", "спроб"];
