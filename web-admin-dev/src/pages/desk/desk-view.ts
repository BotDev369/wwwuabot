/**
 * Макет «Стола»: типи й чисті фільтри, без бази й запитів.
 *
 * Дані приходять із `desk-mock.json`, тож слів у коді немає — тут лише те, що
 * перевіряється тестом: які теми видно за групою, статусом і пошуком.
 *
 * @module web-admin-dev/src/pages/desk/desk-view
 */

export type DeskAuthor = "serhii" | "buffy";

export interface DeskFile {
  name: string;
  size: string;
}

export interface DeskEntry {
  author: DeskAuthor;
  when: string;
  kind: string;
  body: string;
  files: DeskFile[];
}

export interface DeskThread {
  id: string;
  group: string;
  subgroup: string;
  title: string;
  status: string;
  tags: string[];
  updated: string;
  entries: DeskEntry[];
}

export interface DeskFilter {
  group: string;
  status: string;
  query: string;
}

/** Статус → клас бейджа: тон задає статус, а не місце в списку. */
export function statusTone(status: string): string {
  if (status === "done") return "wb-badge-green";
  if (status === "waitingBuffy" || status === "waitingSerhii") return "wb-badge-yellow";
  if (status === "doing") return "wb-badge-accent";
  return "wb-badge-neutral";
}

/** Теми за групою, статусом і пошуком по заголовку, тегах і тексту. */
export function filterThreads(threads: DeskThread[], filter: DeskFilter): DeskThread[] {
  const query = filter.query.trim().toLowerCase();
  return threads.filter((thread) => {
    if (filter.group !== "all" && thread.group !== filter.group) return false;
    if (filter.status !== "all" && thread.status !== filter.status) return false;
    if (!query) return true;
    const haystack = [
      thread.title,
      thread.subgroup,
      thread.tags.join(" "),
      ...thread.entries.map((entry) => entry.body),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}

/** Скільки тем у групі — число в дужках біля назви групи. */
export function countByGroup(threads: DeskThread[], group: string): number {
  if (group === "all") return threads.length;
  return threads.filter((thread) => thread.group === group).length;
}
