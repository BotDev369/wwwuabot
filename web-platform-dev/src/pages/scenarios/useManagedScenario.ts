/**
 * Сценарій за номером з адреси — один для всіх вкладок магазину.
 *
 * Номер у шляху (`/scenarios/7/products`) — це адреса рядка, а не його вміст,
 * тож читає його той, хто знає маршрут: екран. Розбір тут, а не в кожному
 * екрані окремо: сміття в адресі — це не «нуль», а **відсутність** сценарію.
 *
 * Дані бере той самий список (`useManagedScenarios`) — екран шукає в ньому свій
 * рядок. Другий запит «дай одну» віддавав би той самий рядок із тим самим
 * фільтром, а розійтися вони могли б лише в одному — у видимості, тобто саме
 * там, де помилка найдорожча.
 *
 * @module web-platform-dev/src/pages/scenarios
 */

import type { ManagedScenario } from "@wwwuabot/shared/pages";
import { parseScenarioId } from "./scenario-view";
import { useManagedScenarios, type ManagedScenariosState } from "./useManagedScenarios";

export interface ManagedScenarioState {
  /** Сценарій з адреси; `null` — його ще немає (шукають або такого немає взагалі). */
  page: ManagedScenario | null;
  loading: boolean;
  error: string | null;
  /** Список цілком — він же джерело правди для інших рядків того самого екрана. */
  pages: ManagedScenariosState;
}

export function useManagedScenario(id: string | undefined): ManagedScenarioState {
  const pages = useManagedScenarios();
  const scenarioId = parseScenarioId(id);
  const page =
    scenarioId === null ? null : (pages.pages.find((item) => item.id === scenarioId) ?? null);

  return { page, loading: pages.loading, error: pages.error, pages };
}
