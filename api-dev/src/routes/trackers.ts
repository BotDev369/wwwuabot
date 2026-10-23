/**
 * Шляхи трекерів — одним модулем: стрічка, записи дня, групи й дві поверхні на
 * читання. Домен виріс (групи, копія пачкою) і перетнув межу файлу роутера
 * (`AGENTS.md` §3), тож умови переїхали сюди разом із поясненнями.
 *
 * @module api-dev/src/routes/trackers
 */

import type { Env } from "../shared/types";
import {
  handleTrackerEntry,
  handleTrackerPublic,
  handleTrackers,
  handleTrackerTemplates,
} from "../controllers/trackers.controller";
import {
  handleTrackerGroupClear,
  handleTrackerGroups,
} from "../controllers/trackers-groups.controller";

/**
 * Обробити шлях трекерів; `null` — це не він (роутер іде далі).
 *
 * Повертає саме `null`, а не 404: «не трекери» і «нічого не знайшлось» — різні
 * речі, і другою відповіддю володіє роутер. Умови порівнюють шлях цілком, тож
 * порядок між ними безпечний.
 */
export function matchTrackersRoute(
  request: Request,
  env: Env,
  pathname: string,
): Response | Promise<Response> | null {
  // Стрічка, власна мірка й копія з джерела: трекер (назва, одиниця, ціль) і
  // день (значення) — різні речі, тож і ручки різні.
  if (pathname === "/api/user/trackers") return handleTrackers(request, env);
  if (pathname === "/api/user/trackers/entry") return handleTrackerEntry(request, env);

  // Групи — окрема ручка: дерево власника (`parent_id`), глибина не обмежена.
  if (pathname === "/api/user/trackers/group") return handleTrackerGroups(request, env);
  // Спорожнити групу: типова тематика не видаляється, тож прибрати її вміст
  // можна лише так.
  if (pathname === "/api/user/trackers/group/trackers") {
    return handleTrackerGroupClear(request, env);
  }

  // Дві поверхні на читання: каталог («Шаблони») і чужі відкриті визначення
  // («Публічні»). Запис сюди ніколи не йде — додаються вони копією.
  if (pathname === "/api/user/trackers/templates") return handleTrackerTemplates(request, env);
  if (pathname === "/api/user/trackers/public") return handleTrackerPublic(request, env);

  return null;
}
