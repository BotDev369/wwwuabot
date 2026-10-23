/**
 * Два списки поза «Моїми» — каталог і чужі опубліковані визначення —
 * приводяться до одного рядка: назва, група, підпис, джерело й стан кнопки.
 * Група — тематика каталогу або автор: список показують деревом, як «Мої».
 *
 * @module web-platform-dev/src/pages/trackers/tracker-library
 */

import type { IconName } from "@wwwuabot/shared";
import {
  TRACKER_CATALOG_GROUPS,
  formatTrackerAmount,
  type PublicTracker,
  type TrackerTemplate,
} from "@wwwuabot/shared/trackers";

/** Рядок списку: шаблон і публічний трекер виглядають однаково. */
export interface TrackerLibraryItem {
  /** Джерело копії для `POST { from }`: `catalog:<key>` / `public:<id>`. */
  source: string;
  /** Ключ React — не показується. */
  key: string;
  title: string;
  /** Заголовок групи: тематика каталогу або автор опублікованого. */
  group: string;
  /** Підпис під назвою: ціль мірки. */
  meta: string;
  /** Значок мірки — той самий, що в матриці «Моїх». */
  icon: IconName;
  /** Уже моя мірка — кнопка каже «Додано» й не діє. */
  added: boolean;
}

/** Група списку: залитий заголовок і рядки під ним. */
export interface TrackerLibraryGroup {
  title: string;
  items: TrackerLibraryItem[];
}

function goalPart(goal: number | null, unit: string): string {
  return goal === null ? "без цілі" : `ціль ${formatTrackerAmount(goal, unit)}`;
}

export function templateItems(templates: readonly TrackerTemplate[]): TrackerLibraryItem[] {
  return templates.map((template) => ({
    source: `catalog:${template.key}`,
    key: template.key,
    title: template.title,
    group:
      TRACKER_CATALOG_GROUPS.find((item) => item.key === template.groupKey)?.title ??
      "Без тематики",
    meta: goalPart(template.goal, template.unit),
    icon: template.icon,
    added: template.added,
  }));
}

export function publicItems(trackers: readonly PublicTracker[]): TrackerLibraryItem[] {
  return trackers.map((tracker) => ({
    source: `public:${tracker.id}`,
    key: `public-${tracker.id}`,
    title: tracker.title,
    // Порожнє ім'я — закритий профіль, а не помилка: група тоді «спільнота».
    group: tracker.author ? `#${tracker.author}` : "спільнота",
    meta: goalPart(tracker.goal, tracker.unit),
    icon: tracker.icon,
    added: tracker.mine,
  }));
}

/**
 * Дерево списку: групи в порядку першої появи (каталог приходить у порядку
 * тематик, публічні — у порядку видачі), рядки — як прийшли. Порожніх груп не
 * буває за побудовою, тож фільтр пошуку просто віддає менше груп.
 */
export function groupLibrary(items: readonly TrackerLibraryItem[]): TrackerLibraryGroup[] {
  const groups: TrackerLibraryGroup[] = [];
  const byTitle = new Map<string, TrackerLibraryGroup>();
  for (const item of items) {
    const known = byTitle.get(item.group);
    if (known) {
      known.items.push(item);
      continue;
    }
    const group: TrackerLibraryGroup = { title: item.group, items: [item] };
    byTitle.set(item.group, group);
    groups.push(group);
  }
  return groups;
}

/** Пошук по назві, підпису й групі: «море трекерів» пальцем перебирають лише без нього. */
export function filterLibrary(
  items: readonly TrackerLibraryItem[],
  query: string,
): TrackerLibraryItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...items];
  return items.filter((item) =>
    `${item.title} ${item.meta} ${item.group}`.toLowerCase().includes(needle),
  );
}
