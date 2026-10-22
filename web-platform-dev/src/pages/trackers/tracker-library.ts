/**
 * Два списки поза «Моїми» — каталог і чужі опубліковані визначення —
 * приводяться до одного рядка: назва, підпис, джерело й стан кнопки. Один
 * рядок на два списки навмисно: дія та сама («додати в мої»), і друга копія
 * розійшлася б із першою першою ж правкою.
 *
 * @module web-platform-dev/src/pages/trackers/tracker-library
 */

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
  /** Підпис під назвою: тематика й ціль або автор. */
  meta: string;
  /** Уже моя мірка — кнопка каже «Додано» й не діє. */
  added: boolean;
}

function goalPart(goal: number | null, unit: string): string {
  return goal === null ? "" : ` · ціль ${formatTrackerAmount(goal, unit)}`;
}

export function templateItems(templates: readonly TrackerTemplate[]): TrackerLibraryItem[] {
  return templates.map((template) => {
    const group =
      TRACKER_CATALOG_GROUPS.find((item) => item.key === template.groupKey)?.title ?? "";
    return {
      source: `catalog:${template.key}`,
      key: template.key,
      title: template.title,
      meta: `${group}${goalPart(template.goal, template.unit)}`,
      added: template.added,
    };
  });
}

export function publicItems(trackers: readonly PublicTracker[]): TrackerLibraryItem[] {
  return trackers.map((tracker) => ({
    source: `public:${tracker.id}`,
    key: `public-${tracker.id}`,
    title: tracker.title,
    // Порожнє ім'я — закритий профіль, а не помилка: підпис тоді «спільнота».
    meta: `${tracker.author ? `#${tracker.author}` : "спільнота"}${goalPart(tracker.goal, tracker.unit)}`,
    added: tracker.mine,
  }));
}

/** Пошук по назві й підпису: «море трекерів» пальцем перебирають лише без нього. */
export function filterLibrary(
  items: readonly TrackerLibraryItem[],
  query: string,
): TrackerLibraryItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...items];
  return items.filter((item) => `${item.title} ${item.meta}`.toLowerCase().includes(needle));
}
