/**
 * Групи трекерів — **дерево без обмеження глибини**: група містить групи й
 * трекери, «Свої» — корінь для всього, що людина не віднесла сама. Група —
 * рядок `tracker_groups` власника, а не рядок каталогу: типові тематики сіються
 * ключем (`key`), решта — людина. Правила — в `docs/TRACKERS.md`.
 *
 * @module @wwwuabot/shared/trackers/groups
 */

/** Рядок `tracker_groups`: група одного власника. */
export interface TrackerGroup {
  id: number;
  /** Батько; `null` — верхній рівень. Цикли забороняє сервер при переміщенні. */
  parentId: number | null;
  title: string;
  /** Ключ каталогу для типової групи; `null` — власна група людини. */
  key: string | null;
}

/** Вузол дерева груп: діти й трекери належать вузлу, глибина — від кореня. */
export interface TrackerGroupNode {
  group: TrackerGroup;
  children: TrackerGroupNode[];
  /** Трекери цього вузла (без дітей); рахунок у заголовку — рекурсивний. */
  trackers: number[];
  /** Скільки трекерів у вузлі з дітьми — підпис згорнутого акордеона. */
  count: number;
}

export const TRACKER_GROUP_LIMITS = {
  title: 40,
  /** Стеля кількості груп однієї людини; глибина не обмежена. */
  groups: 100,
} as const;

/**
 * Форма групи: назва 1–40 символів, батько — номер або `null`.
 *
 * Назву чистимо так само, як назву трекера: порожній рядок після trim — це
 * відмова, а не група без імені.
 */
export function validateTrackerGroupFields(
  raw: unknown,
):
  { ok: true; value: { title: string; parentId: number | null } } | { ok: false; message: string } {
  if (!raw || typeof raw !== "object") return { ok: false, message: "Порожня форма." };
  const body = raw as Record<string, unknown>;

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > TRACKER_GROUP_LIMITS.title) {
    return { ok: false, message: "Назва групи — від 1 до 40 символів." };
  }

  const rawParent = body.parentId ?? null;
  const parentId =
    rawParent === null
      ? null
      : Number.isInteger(rawParent) && Number(rawParent) > 0
        ? Number(rawParent)
        : undefined;
  if (parentId === undefined)
    return { ok: false, message: "Батьківська група — номер або порожньо." };

  return { ok: true, value: { title, parentId } };
}

/**
 * Дерево груп: верхній рівень — у порядку списку (він уже за id, тобто за
 * часом створення — типові тематики першими). Сирота (батька видалено) не
 * зникає — він стає верхнім рівнем: структура людини не втрачається мовчки.
 */
export function buildTrackerGroupTree(groups: readonly TrackerGroup[]): TrackerGroupNode[] {
  const nodes = new Map<number, TrackerGroupNode>();
  for (const group of groups) {
    nodes.set(group.id, { group, children: [], trackers: [], count: 0 });
  }
  const roots: TrackerGroupNode[] = [];
  for (const group of groups) {
    const node = nodes.get(group.id);
    if (!node) continue;
    const parent = group.parentId === null ? undefined : nodes.get(group.parentId);
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

/** Рекурсивний рахунок трекерів у вузлі — підпис згорнутого акордеона. */
export function countTrackerGroupNode(node: TrackerGroupNode): number {
  return (
    node.trackers.length +
    node.children.reduce((sum, child) => sum + countTrackerGroupNode(child), 0)
  );
}

/** Сплачений список груп із відступом — для вибору групи в селекті. */
export interface TrackerGroupOption {
  group: TrackerGroup;
  /** Рівень вкладеності: 0 — верхній; малюється відступом, не текстом. */
  depth: number;
}

export function flattenTrackerGroupTree(
  nodes: readonly TrackerGroupNode[],
  depth = 0,
): TrackerGroupOption[] {
  const options: TrackerGroupOption[] = [];
  for (const node of nodes) {
    options.push({ group: node.group, depth });
    options.push(...flattenTrackerGroupTree(node.children, depth + 1));
  }
  return options;
}
