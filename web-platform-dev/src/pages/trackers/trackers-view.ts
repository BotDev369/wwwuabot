/**
 * Вигляд трекерів — чисті функції: клітинки матриці дня, зсув виміру й момент
 * запису. День тут — не сутність, а підпис: «сьогодні», «вчора», «05.10».
 *
 * @module web-platform-dev/src/pages/trackers/trackers-view
 */

import {
  addTrackerDays,
  compareTrackerEntries,
  formatTrackerAmount,
  formatTrackerValue,
  TRACKER_OWN_GROUP_KEY,
  trackerAmountText,
  trackerMode,
  type Tracker,
  type TrackerEntry,
  type TrackerEntryRow,
  type TrackerFields,
  type TrackerGroup,
  type TrackerMode,
  type TrackerValueType,
} from "@wwwuabot/shared/trackers";
import { trackerDayLast, trackerDayTotals } from "@wwwuabot/shared/trackers/analytics";

/** Записи одного трекера — без `trackerId`, який рядку вже не потрібен. */
export function entriesOf(entries: readonly TrackerEntryRow[], trackerId: number): TrackerEntry[] {
  return entries
    .filter((entry) => entry.trackerId === trackerId)
    .map(({ id, day, value, note, loggedAt }) => ({ id, day, value, note, loggedAt }));
}

/** Одна клітинка матриці: день без запису — `null`, а не нуль. */
export interface TrackerCellView {
  day: string;
  value: number | null;
  /** Ціль дня досягнута (лише коли ціль є) — клітинка підсвічується. */
  goalMet: boolean;
}

/**
 * Матриця одного трекера: клітинки за днями вікна. Значення дня — те саме
 * зведення, що й на сторінці трекера: сума для `sum`, останній вимір для
 * `read` — одне джерело правди, а не друга арифметика стрічки.
 */
export function trackerCells(
  tracker: Tracker,
  entries: readonly TrackerEntryRow[],
  days: readonly string[],
): TrackerCellView[] {
  const own = entriesOf(entries, tracker.id);
  const mode: TrackerMode = trackerMode(tracker);
  const values = mode === "sum" ? trackerDayTotals(own) : trackerDayLast(own);
  return days.map((day) => {
    const value = values.get(day) ?? null;
    return {
      day,
      value,
      goalMet: value !== null && tracker.goal !== null && value >= tracker.goal,
    };
  });
}

/** Вікно матриці: `count` днів, завершуючи днем стрічки (включно). */
export function matrixDays(endDay: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addTrackerDays(endDay, -index));
}

/** Підпис дня матриці: «Пт 17» — день тижня читається першим, бо по ньому й шукають. */
const WEEKDAYS = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] as const;

/** День тижня шапки: «Чт» — по ньому людина й шукає колонку. */
export function matrixWeekday(day: string): string {
  return WEEKDAYS[new Date(`${day}T00:00:00Z`).getUTCDay()] ?? "";
}

/** Число місяця шапки: «22» — другий рядок під днем тижня. */
export function matrixDayNumber(day: string): number {
  return Number(day.slice(8, 10));
}

/** Підпис дня одним рядком: «Пт 17» — там, де шапки немає (історія, картка). */
export function matrixDayLabel(day: string): string {
  return `${matrixWeekday(day)} ${matrixDayNumber(day)}`;
}

/**
 * Клітинка коротша за рядок історії: «8 000» у клітинці ширшої одиниці не
 * вміщується, тож тисячі йдуть скорочено («8к»), а дробові — без зайвих нулів.
 * «Так-ні» не числи́ться — клітинка несе статус (спільне правило показу).
 */
export function cellAmount(
  value: number | null,
  tracker: Pick<TrackerFields, "valueType">,
): string {
  if (value === null) return "";
  if (tracker.valueType === "boolean") return trackerAmountText(value, { ...tracker, unit: "" });
  const rounded = Math.round(value * 10) / 10;
  if (Math.abs(rounded) >= 10000) return `${Math.round(rounded / 1000)}к`;
  return formatTrackerAmount(rounded, "");
}

export interface TrackerGroupTreeView {
  group: TrackerGroup;
  children: TrackerGroupTreeView[];
  /** Мірки цієї групи — самі трекери, рядок у стрічці міряє день собі сам. */
  trackers: readonly Tracker[];
  /** Рекурсивний рахунок — підпис згорнутого акордеона. */
  count: number;
}

/**
 * Дерево груп стрічки: верхній рівень — у порядку id (типові тематики сіються
 * першими). Порожня **типова** тематика не показується — це шум; група, яку
 * створила людина (`key === null`), лишається навіть порожня, разом із
 * батьками: інакше щойно створена група не з'являлась би до першого трекера.
 */
export function groupRowsTree(
  trackers: readonly Tracker[],
  groups: readonly TrackerGroup[],
): TrackerGroupTreeView[] {
  const ownId = groups.find((group) => group.key === TRACKER_OWN_GROUP_KEY)?.id ?? null;
  const byGroup = new Map<number, Tracker[]>();
  for (const tracker of trackers) {
    const id = tracker.groupId ?? ownId;
    if (id === null) continue;
    const bucket = byGroup.get(id);
    if (bucket) bucket.push(tracker);
    else byGroup.set(id, [tracker]);
  }

  const views = new Map<number, TrackerGroupTreeView>();
  for (const group of groups) {
    views.set(group.id, {
      group,
      children: [],
      trackers: byGroup.get(group.id) ?? [],
      count: 0,
    });
  }
  const roots: TrackerGroupTreeView[] = [];
  for (const group of groups) {
    const view = views.get(group.id);
    if (!view) continue;
    const parent = group.parentId === null ? undefined : views.get(group.parentId);
    if (parent) parent.children.push(view);
    else roots.push(view);
  }

  // Рахунок рекурсивно від листків; порожні типові тематики прибираємо після —
  // гілка лишається, якщо під нею є трекер, власна група людини або така
  // власна група в підгрупах.
  const countOf = (view: TrackerGroupTreeView): number =>
    view.trackers.length + view.children.reduce((sum, child) => sum + countOf(child), 0);
  const prune = (view: TrackerGroupTreeView): TrackerGroupTreeView | null => {
    view.children = view.children
      .map(prune)
      .filter((child): child is TrackerGroupTreeView => child !== null);
    view.count = countOf(view);
    const keep = view.count > 0 || view.group.key === null || view.children.length > 0;
    return keep ? view : null;
  };
  return roots.map(prune).filter((view): view is TrackerGroupTreeView => view !== null);
}

/** Рядок дерева груп для модалки «Групи»: глибина відступу й межі сусідів. */
export interface GroupTreeLine {
  group: TrackerGroup;
  depth: number;
  /** Перший серед сусідів одного батька — «вгору» вимкнена. */
  first: boolean;
  /** Останній серед сусідів — «вниз» вимкнена. */
  last: boolean;
}

/**
 * Дерево груп плоским списком (DFS): модалка малює рядки без рекурсії,
 * а `first`/`last` дають межі для руху вгору/вниз. Сирота (батька видалили)
 * піднімається на верхній рівень, а не зникає; `seen` — охорона від циклу,
 * який замкнув би обхід (сервер цикл не створює, але й малюнок не має
 * зависати, якщо дані приїхали криві).
 */
export function groupTreeLines(groups: readonly TrackerGroup[]): GroupTreeLine[] {
  const known = new Set(groups.map((group) => group.id));
  const byParent = new Map<number | null, TrackerGroup[]>();
  for (const group of groups) {
    const parent = group.parentId !== null && known.has(group.parentId) ? group.parentId : null;
    const bucket = byParent.get(parent);
    if (bucket) bucket.push(group);
    else byParent.set(parent, [group]);
  }

  const lines: GroupTreeLine[] = [];
  const seen = new Set<number>();
  const walk = (parentId: number | null, depth: number): void => {
    const siblings = byParent.get(parentId) ?? [];
    siblings.forEach((group, index) => {
      if (seen.has(group.id)) return;
      seen.add(group.id);
      lines.push({ group, depth, first: index === 0, last: index === siblings.length - 1 });
      walk(group.id, depth + 1);
    });
  };
  walk(null, 0);
  // Недосяжне з кореня (цикл або батька підчистили вручну) — теж рядки,
  // а не нікуди: модалка мусить показати все, що є в базі, інакше група
  // стає невидимою для управління.
  for (const group of groups) {
    if (seen.has(group.id)) continue;
    seen.add(group.id);
    lines.push({ group, depth: 0, first: false, last: false });
  }
  return lines;
}

/**
 * Історія — найновіше першим. Порядок дає спільний `compareTrackerEntries`:
 * день, момент запису, номер рядка — щоб два записи в одну секунду не мінялися
 * місцями (той самий порядок, що в `useTracker`).
 */
export function newestFirst(entries: readonly TrackerEntry[]): TrackerEntry[] {
  return [...entries].sort((a, b) => compareTrackerEntries(b, a));
}

/** Час запису «13:45»; без часу — порожньо. */
export function timeLabel(loggedAt: string | null): string {
  const time = (loggedAt ?? "").slice(11, 16);
  return /^\d{2}:\d{2}$/.test(time) ? time : "";
}

/** «10.05» — схема дати, за якою людина шукає рядок в історії. */
export function dayLabel(day: string): string {
  const [, month, date] = day.split("-");
  return `${date}.${month}`;
}

/** Коли був запис: «сьогодні», «вчора», далі — дата. */
export function whenLabel(day: string, endDay: string): string {
  if (day === endDay) return "сьогодні";
  if (day === addTrackerDays(endDay, -1)) return "вчора";
  return dayLabel(day);
}

export function amountOrDash(value: number | null, unit: string): string {
  return value === null ? "—" : formatTrackerAmount(value, unit);
}

/** Підпис цілі: «ціль 8 год» або порожньо — без цілі нема чого досягати. */
export function goalLabel(tracker: Tracker): string | null {
  if (tracker.goal === null) return null;
  return `ціль ${formatTrackerAmount(tracker.goal, tracker.unit)}`;
}

/**
 * Огляд чернетки нового трекера: що саме записуватиме ця мірка. Назва сюди не
 * входить — її людина бачить у полі; тут форма запису, яку обирають навички.
 */
export function trackerDraftSummary(draft: {
  valueType: TrackerValueType;
  unit: string;
  goal: number | null;
}): string {
  if (draft.valueType === "boolean") return "Так-ні · статус дня";
  const parts = ["Число", draft.unit || "без одиниці"];
  if (draft.goal !== null) parts.push(`ціль ${formatTrackerValue(draft.goal)}`);
  return parts.join(" · ");
}

export interface ChartBand {
  min: number;
  max: number;
}

/**
 * Діапазон для **лінії** вимірів: не від нуля, а навколо самих значень.
 *
 * Стовпчик від нуля для ваги 78–79 кг — пласка лінія на всю висоту, тобто
 * графік, що нічого не показує. Ціль входить у діапазон: відстань до неї —
 * те, заради чого на неї дивляться.
 */
export function readingBand(values: readonly number[], goal: number | null): ChartBand {
  const numbers = goal === null ? [...values] : [...values, goal];
  if (numbers.length === 0) return { min: 0, max: 1 };
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const pad = max > min ? (max - min) * 0.12 : Math.max(Math.abs(max) * 0.1, 0.5);
  return { min: min - pad, max: max + pad };
}

/** Зсув зі знаком: «−0,5 кг», «+1,5 год» — знак і є відповіддю «вгору чи вниз». */
export function signedAmount(value: number, unit: string): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatTrackerAmount(Math.abs(value), unit)}`;
}

/** Зсув виміру за вікно словами: «−0,5 кг за 30 дн.» */
export function changeAmountLabel(
  change: number | null,
  unit: string,
  days: number,
): string | null {
  if (change === null) return null;
  if (change === 0) return `Без змін за ${days} дн.`;
  return `${signedAmount(change, unit)} за ${days} дн.`;
}

/**
 * Зміна середнього — словами, а не знаком: стрілка вгору для витрат читалась
 * би як «добре», хоч це «більше». Тому кажемо просто «більше/менше».
 */
export function changeLabel(changePct: number | null): string | null {
  if (changePct === null) return null;
  if (Math.abs(changePct) < 1) return "Як у попередній період";
  const amount = Math.abs(changePct).toLocaleString("uk-UA", { maximumFractionDigits: 1 });
  return changePct > 0 ? `Більше на ${amount}%` : `Менше на ${amount}%`;
}

/** Вікно для запиту: запас на попередній період дає «краще/гірше». */
export function historySince(endDay: string, days: number): string {
  return addTrackerDays(endDay, -(days * 2 - 1));
}
