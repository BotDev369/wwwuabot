/**
 * Подання сценарію — те, що екран бере з адреси.
 *
 * Сторінку малює один алгоритм (`ScenarioPage` за `slug`), а вкладки магазину
 * живуть за номером рядка `scenarios` (`/scenarios/7/products`). Номер — це
 * адреса, а не вміст, тож розбирає його один переклад, а не кожен екран окремо.
 *
 * @module web-platform-dev/src/pages/scenarios
 */

/**
 * Номер сценарію з адреси: ціле, більше за нуль.
 *
 * Усе інше — `null`, і це не дрібниця: сміття в адресі (`/scenarios/abc`) — не
 * «нуль», а **відсутність** сценарію, тож запит із таким номером пішов би в
 * нікуди й повернув чужу помилку.
 */
export function parseScenarioId(id: string | undefined): number | null {
  const parsed = Number(id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
