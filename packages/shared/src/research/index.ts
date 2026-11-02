/**
 * Дослідження «вірування і невірування»: каталог блоків, спільний для сервера й
 * платформи. Контент живе в `page_data`, тут — покажчик: адреса, назва, цифри.
 *
 * @module @wwwuabot/shared/research
 */

/** Одна ключова цифра блоку — те саме, що `keyFigures` у фронтматері. */
export interface ResearchFigure {
  label: string;
  value: string;
}

/** Блок дослідження в каталозі: адреса, назва, група, цифри. */
export interface ResearchBlock {
  /** Літера групи + номер: `a1`, `d1`. */
  id: string;
  /** Адреса сторінки блоку — рядок `scenarios` (`viruvannia-a1`). */
  slug: string;
  /** Ключ групи: `A`–`F`. */
  group: string;
  /** Підпис групи для людини: «Масштаб», «Релігії»… */
  groupTitle: string;
  title: string;
  oneLiner: string;
  dataDate: string;
  publishedDate: string;
  /** `verified` | `estimate` | `in-progress` | `doctrinal`. */
  dataStatus: string;
  readingTime: number;
  keyFigures: ResearchFigure[];
}

/** Каталог цілком: лендінг і його блоки. */
export interface ResearchCatalog {
  title: string;
  /** Адреса лендінга — та сама, що в рядка `scenarios`. */
  slug: string;
  /** Дата збірки каталогу (`YYYY-MM-DD`). */
  updatedAt: string;
  blocks: ResearchBlock[];
}

/** Адреса лендінга дослідження — одна на сервер, платформу й міграцію. */
export const RESEARCH_LANDING_SLUG = "viruvannia";

/** Назва дослідження — та сама, що в рядка `scenarios` і в каталозі. */
export const RESEARCH_TITLE = "Дослідження: вірування і невірування";

/** Префікс адрес блоків: лендінг — `viruvannia`, блок — `viruvannia-a1`. */
export const RESEARCH_BLOCK_PREFIX = `${RESEARCH_LANDING_SLUG}-`;

/** Чи це адреса блоку дослідження — за нею відкривається контентна сторінка. */
export function isResearchBlockSlug(slug: string): boolean {
  return slug.startsWith(RESEARCH_BLOCK_PREFIX);
}

/** Блок за адресою; невідома адреса — `null` (каталог міг ще не дочитатись). */
export function researchBlockBySlug(
  blocks: readonly ResearchBlock[],
  slug: string,
): ResearchBlock | null {
  return blocks.find((block) => block.slug === slug) ?? null;
}

/** Розділ дослідження: підпис групи й блоки, що до неї входять. */
export interface ResearchChapter {
  /** Ключ групи: `A`–`F`, або порожній рядок для блоків без групи. */
  group: string;
  title: string;
  blocks: ResearchBlock[];
}

/**
 * Блоки, згруповані в розділи — **в порядку першої появи**, а не за алфавітом.
 *
 * Порядок задає автор дослідження: розділ A стоїть першим не тому, що літера
 * перша в абетці, а тому що з нього починається читання.
 */
export function researchChapters(blocks: readonly ResearchBlock[]): ResearchChapter[] {
  const chapters: ResearchChapter[] = [];
  for (const block of blocks) {
    const title = block.groupTitle.trim() || block.group.trim() || "Дослідження";
    const chapter = chapters.find((candidate) => candidate.title === title);
    if (chapter) chapter.blocks.push(block);
    else chapters.push({ group: block.group, title, blocks: [block] });
  }
  return chapters;
}

/** Сусіди блоку в порядку читання — «далі» й «назад» у кінці сторінки. */
export interface ResearchNeighbours {
  previous: ResearchBlock | null;
  next: ResearchBlock | null;
}

export function researchNeighbours(
  blocks: readonly ResearchBlock[],
  slug: string,
): ResearchNeighbours {
  const index = blocks.findIndex((block) => block.slug === slug);
  if (index < 0) return { previous: null, next: null };
  return {
    previous: blocks[index - 1] ?? null,
    next: blocks[index + 1] ?? null,
  };
}

/** Підпис статусу даних — те, що людина читає замість службового `verified`. */
export function researchStatusLabel(status: string): string | null {
  const labels: Record<string, string> = {
    verified: "Перевірено за джерелом",
    estimate: "Оцінка",
    "in-progress": "У роботі",
    doctrinal: "Доктринальне джерело",
  };
  return labels[status] ?? null;
}

/** Скільки хвилин читання — сума по блоках; порожній каталог дає `0`. */
export function researchReadingMinutes(blocks: readonly ResearchBlock[]): number {
  return blocks.reduce((total, block) => total + (block.readingTime || 0), 0);
}

/**
 * Скільки блоків опубліковано — або `null`, коли каталог не дочитався.
 *
 * **`null` і `0` — різні речі.** Нуль означає «каталог є й він порожній», а
 * `null` — «не знаємо»: підпис «0 блоків» на екрані, де каталог просто не
 * відповів, читався б як «дослідження видалили».
 */
export function researchBlockCount(catalog: ResearchCatalog | null): number | null {
  return catalog && Array.isArray(catalog.blocks) ? catalog.blocks.length : null;
}
