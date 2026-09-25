/**
 * Чисті перетворення зрізу — те, що однаково потрібно серверу й сторінці.
 *
 * Тут немає ні запитів, ні рендерингу: тільки функції над даними з
 * `types.ts`. Саме тому вони тестуються без воркера й без браузера, а
 * сторінка не має власної копії правила «як рахувати зміну».
 *
 * **Ключ значення — `група|метрика`.** Одне число без групи нічого не
 * означає: `code.files` у `api-dev` і в `packages` — різні речі, а спільний
 * для проєкту — лише `total`. Рядок як ключ вибрано навмисно: він читається
 * в зневаджувачі й не потребує Map-ів у стані React.
 *
 * @module @wwwuabot/shared/monitoring/snapshot
 */

import {
  TOTAL_GROUP,
  type MetricValue,
  type MonitoringSnapshot,
  type SnapshotPoint,
} from "./types";

/** Ключ значення в плоскому словнику (`api-dev|code.files`). */
export function valueKey(group: string, metric: string): string {
  return `${group}|${metric}`;
}

/** Плоский словник значень зрізу — для швидкого доступу в розмітці. */
export function indexValues(values: readonly MetricValue[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const value of values) out[valueKey(value.group, value.metric)] = value.value;
  return out;
}

/** Значення зрізу в одній групі: `{ "code.files": 320, … }`. */
export function groupValues(
  values: readonly MetricValue[],
  group: string = TOTAL_GROUP,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const value of values) {
    if (value.group === group) out[value.metric] = value.value;
  }
  return out;
}

/** Групи (воркспейси) зрізу — у тому порядку, у якому вони прийшли. */
export function groupsOf(values: readonly MetricValue[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (value.group === TOTAL_GROUP || seen.has(value.group)) continue;
    seen.add(value.group);
    out.push(value.group);
  }
  return out;
}

/**
 * Зміна кожного показника проти попереднього зрізу.
 *
 * Показник, якого в попередньому зрізі не було, у результат **не**
 * потрапляє: «+320 файлів» від того, що показник з'явився вперше, — це
 * вигадка, а не динаміка. Сторінка показує зміну лише там, де є з чим
 * порівнювати.
 */
export function diffSnapshots(
  latest: MonitoringSnapshot | null,
  previous: MonitoringSnapshot | null,
): Record<string, number> {
  if (!latest || !previous) return {};
  const before = indexValues(previous.values);
  const out: Record<string, number> = {};
  for (const value of latest.values) {
    const key = valueKey(value.group, value.metric);
    const was = before[key];
    if (was === undefined) continue;
    out[key] = value.value - was;
  }
  return out;
}

/** Ряд значень показника по зрізах — у хронологічному порядку (старіші перші). */
export function metricSeries(
  history: readonly SnapshotPoint[],
  metric: string,
  group: string = TOTAL_GROUP,
): number[] {
  return [...history]
    .sort((a, b) => a.id - b.id)
    .map((point) => point.totals[valueKey(group, metric)] ?? 0);
}

/** Історія в хронологічному порядку — графік малює саме її. */
export function sortPoints(points: readonly SnapshotPoint[]): SnapshotPoint[] {
  return [...points].sort((a, b) => a.id - b.id);
}

/**
 * Значення показника по зрізах — із **діркою** там, де його не міряли.
 *
 * `metricSeries` вище віддає нуль, і для графіка це правильно: лінія мусить
 * мати точку на кожен зріз. Для таблиці «показник × зріз» нуль непридатний —
 * він читається як «нуль рядків», хоч означає «у тому зрізі не міряли».
 * Тому тут `undefined`, і сторінка малює прочерк.
 */
export function metricValues(
  points: readonly SnapshotPoint[],
  metric: string,
  group: string = TOTAL_GROUP,
): (number | undefined)[] {
  return sortPoints(points).map((point) => point.totals[valueKey(group, metric)]);
}

/**
 * Зміна показника за весь період історії: від першого виміряного до останнього.
 *
 * Одного вимірювання замало — різниці немає, і це `undefined`, а не нуль:
 * «0» читалось би як «не змінився», хоч насправді порівнювати нема з чим.
 * Зрізи, де показника не було (частковий збір), з розрахунку випадають: вони
 * не обрив динаміки, а просто не міряли.
 */
export function periodDelta(
  points: readonly SnapshotPoint[],
  metric: string,
  group: string = TOTAL_GROUP,
): number | undefined {
  const measured = metricValues(points, metric, group).filter(
    (value): value is number => value !== undefined,
  );
  if (measured.length < 2) return undefined;
  return measured[measured.length - 1] - measured[0];
}

/**
 * Коміт, спільний для всіх зрізів, або `null`.
 *
 * **Навіщо це взагалі.** Рівна лінія на графіку має дві різні причини: код
 * між зрізами не змінювався — або ми не змогли порахувати й записали нулі.
 * Перше — правда, друге — поломка, і плутати їх не можна. Якщо всі зрізи
 * стоять на одному коміті, нульова динаміка **очікувана**, і сторінка має
 * сказати це вголос, а не мовчати рівною лінією.
 *
 * Зріз без коміта (`ref === null`) ламає висновок: невідомо, на чому його
 * знято, тож обіцяти «той самий коміт» нема права.
 */
export function sameRef(points: readonly SnapshotPoint[]): string | null {
  if (points.length < 2) return null;
  const first = points[0].ref;
  if (!first) return null;
  return points.every((point) => point.ref === first) ? first : null;
}
