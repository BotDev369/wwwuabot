/**
 * Значення полів ↔ `page_data`: розгорнути каркас і прочитати його назад.
 *
 * Обидва напрямки живуть в одному файлі навмисно. `buildPageConfig` кладе текст
 * у блоки за плейсхолдерами каркаса (`{{ключ}}`), `readPageValues` читає **ті
 * самі місця** — і якби це були два файли, розійтись вони могли б тихо: форма
 * показала б не те, що на сторінці, і помітити це можна було б лише оком.
 *
 * **Порожнього не видно.** Блок, який мав текст і не отримав його, на сторінку
 * не потрапляє зовсім — разом із підписом, карткою й лінією навколо нього. Тож
 * «візитка з самого імені» — повноцінна сторінка, а не набір порожніх
 * прямокутників. Лінія ж (`divider`) без сусідів не малюється взагалі: шов
 * посеред порожнього екрана — не розділ.
 *
 * Самі шаблони — дані, і лежать вони у `templates.ts`.
 *
 * @module @wwwuabot/shared/pages
 */

import type { BlockZone, PageBlock, PageConfig } from "../types/page-config.types";
import {
  pageBlockId,
  type PageBlockSpec,
  type PageFieldPlacement,
  type PageFieldValues,
  type PageTemplate,
} from "./templates";

/** Плейсхолдер поля: `{{ключ}}`. */
const PLACEHOLDER = /\{\{([a-z0-9_-]+)\}\}/gi;

/**
 * Блоки, які самі нічого не кажуть — вони лише розділяють сусідів.
 *
 * Потрібні окремо, бо в порожньої сторінки лінія лишається без сусідів: вона
 * тоді не «розділяє», а малює шов посеред порожнього екрана.
 */
const DECORATION_TYPES = new Set(["divider", "spacer"]);

/**
 * Блоки, вміст яких лежить **не в `page_data`**, а у своїй таблиці.
 *
 * Правило «порожнього не видно» про них не діє: у `shop-grid` немає жодного
 * текстового поля, і порожній блок тут означає не незаповнене поле, а
 * магазин, у якому товарів ще не додали — тобто нормальну сторінку. Від
 * декорацій він відрізняється: декорація без сусідів зайва, а сітка товарів —
 * це і є сторінка магазину (docs/SHOPS.md §3).
 */
const DATA_TYPES = new Set(["shop-grid"]);

function isDecoration(type: string): boolean {
  return DECORATION_TYPES.has(type);
}

/** Чи тримає блок власний вміст — тоді порожнього поля в нього не буває. */
function hasOwnContent(type: string): boolean {
  return DATA_TYPES.has(type);
}

const EMPTY_ZONES: Record<BlockZone, PageBlock[]> = {
  sidebar: [],
  header: [],
  main: [],
  footer: [],
};

/**
 * Один prop: підставити значення й сказати, скільки тексту він **просив** і
 * скільки **отримав**.
 *
 * Просив/отримав — це і є правило «порожнього не видно»: `0/1` означає «блок
 * був потрібен лише заради цього тексту, а тексту немає».
 */
function fillProp(
  raw: string,
  values: PageFieldValues,
): { value: string | null; declared: number; filled: number } {
  const keys = [...raw.matchAll(PLACEHOLDER)];
  if (keys.length === 0) return { value: raw, declared: 0, filled: 0 };

  let filled = 0;
  const value = raw
    .replace(PLACEHOLDER, (_all, key: string) => {
      const text = (values[key] ?? "").trim();
      if (text) filled += 1;
      return text;
    })
    .trim();

  return { value: value || null, declared: keys.length, filled };
}

function buildBlock(
  template: PageTemplate,
  spec: PageBlockSpec,
  values: PageFieldValues,
): PageBlock | null {
  const props: Record<string, unknown> = {};
  let declared = 0;
  let filled = 0;

  for (const [name, raw] of Object.entries(spec.props)) {
    if (typeof raw !== "string") {
      props[name] = raw;
      continue;
    }
    const result = fillProp(raw, values);
    declared += result.declared;
    filled += result.filled;
    if (result.value !== null) props[name] = result.value;
  }

  const children = buildBlocks(template, spec.children ?? [], values);

  // Текст просили — і не отримали: порожній заголовок це не «порожньо», це
  // помітно зламана сторінка.
  if (declared > 0 && filled === 0 && children.length === 0) return null;
  // Каркас без власного тексту потрібен лише заради вмісту (картка навколо
  // розділу); без нього він — порожній прямокутник. Крім тих блоків, чий вміст
  // лежить у своїй таблиці: їхній порожній стан — це магазин без товарів, а не
  // незаповнене поле.
  if (
    declared === 0 &&
    children.length === 0 &&
    !isDecoration(spec.type) &&
    !hasOwnContent(spec.type)
  )
    return null;

  return {
    id: pageBlockId(template, spec.id),
    type: spec.type,
    order: 0,
    props,
    ...(children.length > 0 ? { children } : {}),
  };
}

function buildBlocks(
  template: PageTemplate,
  specs: readonly PageBlockSpec[],
  values: PageFieldValues,
): PageBlock[] {
  const kept: PageBlock[] = [];

  for (const spec of specs) {
    const block = buildBlock(template, spec, values);
    if (!block) continue;
    // Дві декорації підряд і декорація на самому початку — це шов без швів:
    // розділяти нічого.
    if (isDecoration(block.type) && (kept.length === 0 || isDecoration(kept[kept.length - 1].type)))
      continue;
    kept.push(block);
  }

  while (kept.length > 0 && isDecoration(kept[kept.length - 1].type)) kept.pop();

  return kept.map((block, order) => ({ ...block, order }));
}

/**
 * Значення → `page_data`.
 *
 * Каркас розгортається в блоки, плейсхолдери заміняються значеннями, а все, що
 * лишилось без тексту, на сторінку не йде. Порядок блоків — це порядок каркаса:
 * окремого списку «що за чим» немає, бо він розійшовся б із каркасом першою ж
 * правкою.
 */
export function buildPageConfig(template: PageTemplate, values: PageFieldValues): PageConfig {
  return {
    version: 1,
    zones: { ...EMPTY_ZONES, main: buildBlocks(template, template.layout, values) },
    visibleZones: ["main"],
  };
}

/**
 * Де лежить кожне поле — **із каркаса**, а не з `id` блока.
 *
 * Одна функція на читання значень і на перевірку шаблону
 * (`templates.test.ts`): розійтись вони могли б лише так, що поле показували б
 * з одного блока, а читали з іншого.
 */
export function fieldPlacements(template: PageTemplate): Record<string, PageFieldPlacement> {
  const placements: Record<string, PageFieldPlacement> = {};

  const walk = (specs: readonly PageBlockSpec[]): void => {
    for (const spec of specs) {
      const blockId = pageBlockId(template, spec.id);
      for (const [prop, raw] of Object.entries(spec.props)) {
        if (typeof raw !== "string") continue;
        for (const match of raw.matchAll(PLACEHOLDER)) {
          // Перше місце — те, з якого поле читають назад: друге те саме
          // значення дало б другу відповідь на питання «що писала людина».
          if (!placements[match[1]]) placements[match[1]] = { blockId, prop };
        }
      }
      if (spec.children) walk(spec.children);
    }
  };

  walk(template.layout);
  return placements;
}

function collectBlocks(
  blocks: readonly PageBlock[],
  into: Map<string, PageBlock>,
): Map<string, PageBlock> {
  for (const block of blocks) {
    into.set(block.id, block);
    if (block.children?.length) collectBlocks(block.children, into);
  }
  return into;
}

function propsOf(block: PageBlock | undefined): Record<string, unknown> {
  return (block?.props ?? {}) as Record<string, unknown>;
}

function textOf(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

/**
 * `page_data` → значення (назад).
 *
 * Читається **те саме місце**, куди `buildPageConfig` поклав текст
 * (`placements`), тож форма відкриває написане, а не здогад.
 *
 * **Сторінка, збережена до каркаса, читається як раніше.** Раніше кожне поле
 * було окремим текстовим блоком із `id` `шаблон-поле`; такі сторінки (їх уже
 * могло лишитись кілька) читаються за старими `id`, але **лише тоді, коли в
 * `page_data` немає жодного блока нового каркаса** — інакше картка «Про себе»
 * (`card-about`) віддала б свій підпис як текст людини.
 */
export function readPageValues(template: PageTemplate, config: PageConfig | null): PageFieldValues {
  const values: PageFieldValues = {};
  if (!config) return values;

  const blocks = collectBlocks(config.zones.main, new Map());
  const placements = fieldPlacements(template);
  const fromLayout = (specs: readonly PageBlockSpec[]): boolean =>
    specs.some(
      (spec) =>
        blocks.has(pageBlockId(template, spec.id)) ||
        (spec.children ? fromLayout(spec.children) : false),
    );

  const legacy = !fromLayout(template.layout);

  for (const field of template.fields) {
    const placement = placements[field.key];
    let value = placement ? textOf(propsOf(blocks.get(placement.blockId))[placement.prop]) : "";

    if (!value && legacy) {
      const old = propsOf(blocks.get(pageBlockId(template, field.key)));
      value = textOf(old.content) || textOf(old.title);
    }

    if (value) values[field.key] = value;
  }

  return values;
}
