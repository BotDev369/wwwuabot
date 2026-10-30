/**
 * Дослідження «У що вірить людство»: каталог блоків, спільний для сервера й
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
