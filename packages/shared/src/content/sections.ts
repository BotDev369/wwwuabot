/**
 * Адреса розділу, що існує рядком контенту (`scenarios`), а не маршрутом:
 * її читають футер, хаб «Створити» і типові значення блоків, тож другий
 * літерал розійшовся б із першим (AGENTS.md §3, «двічі — в спільне»).
 *
 * @module @wwwuabot/shared/content/sections
 */

import { toWebPath } from "./resolve";

/** Розділ «Аналіз дат»: дата народження, таблиця дат і результат аналізу. */
export const DATE_ANALYSIS_SLUG = "dateanalysis";

/** Та сама адреса у вебі. */
export const DATE_ANALYSIS_PATH = toWebPath(DATE_ANALYSIS_SLUG);

/** Екран результату аналізу — окремий рядок контенту під адресою розділу. */
export const DATE_ANALYSIS_RESULT_SLUG = `${DATE_ANALYSIS_SLUG}/analysis`;

/** Та сама адреса результату у вебі. */
export const DATE_ANALYSIS_RESULT_PATH = toWebPath(DATE_ANALYSIS_RESULT_SLUG);
