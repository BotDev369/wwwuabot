/**
 * Page Builder — допоміжні функції для роботи з конфігурацією сторінки.
 *
 * @module packages/shared/src/types/page-config.utils
 */

import type { BlockZone, PageBlock, PageConfig } from "./page-config.types";

// ── Константи ─────────────────────────────────────────────────────

/** Усі зони як масив (для ітерації). */
export const ALL_ZONES: readonly BlockZone[] = ["sidebar", "header", "main", "footer"] as const;

/**
 * Версія формату `page_data` — **контракт**, а не «місце для майбутнього».
 *
 * Пише її тільки наш конструктор, тож більше число означає рядок, зроблений
 * новішим кодом: таку сторінку не рендеримо (краще «сторінки немає», ніж
 * половина блоків) і лишаємо слід у консолі. Правило — `docs/PAGES.md` §2.
 */
export const PAGE_DATA_VERSION = 1;

// ── Функції ───────────────────────────────────────────────────────

/** Порожня конфігурація сторінки (дефолт при створенні нового сценарію). */
export function createEmptyPageConfig(): PageConfig {
  return {
    version: PAGE_DATA_VERSION,
    zones: {
      sidebar: [],
      header: [],
      main: [],
      footer: [],
    },
    visibleZones: [],
  };
}

/**
 * Безпечний парсинг page_data: новий формат `{version, zones}`, старий
 * `{v, slots}` конвертується, битe — `null`.
 *
 * Кожен прочитаний конфіг приводиться до канонічної форми
 * (`normalizePageConfig`): «є поле `zones`» ще не означає, що в ньому є всі
 * чотири зони, а `ZoneRenderer` на `[...undefined]` валить усю сторінку.
 */
export function parsePageConfig(raw: string | null): PageConfig | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

    // Новий формат (Page Builder)
    if ("version" in parsed && "zones" in parsed) {
      const version = (parsed as Record<string, unknown>).version;
      if (!isKnownVersion(version)) {
        warnUnknownVersion(version);
        return null;
      }
      return normalizePageConfig(parsed as Record<string, unknown>);
    }

    // Старий формат (web_config / slots) — конвертуємо
    if ("v" in parsed && "slots" in parsed) {
      return convertOldFormat(parsed);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Приводить прочитаний конфіг до канонічної форми.
 *
 * Нічого не вигадує: відсутню зону робить порожньою, блок без `type`
 * відкидає (він і так не рендериться), `order` приводить до числа, бо
 * сортування `a.order - b.order` на рядку давало `NaN` і порядок блоків
 * ставав випадковим. Решта полів блоку лишається як є — їх читає сам блок.
 */
export function normalizePageConfig(input: PageConfig | Record<string, unknown>): PageConfig {
  const source = input as Record<string, unknown>;
  const rawZones = (source.zones ?? {}) as Record<string, unknown>;
  const zones = {} as Record<BlockZone, PageBlock[]>;
  for (const zone of ALL_ZONES) {
    const blocks = rawZones[zone];
    zones[zone] = Array.isArray(blocks) ? normalizeBlocks(blocks) : [];
  }

  const visibleZones = Array.isArray(input.visibleZones)
    ? ([...new Set(input.visibleZones)] as BlockZone[]).filter((zone) => ALL_ZONES.includes(zone))
    : [];

  /* Результат нормалізації — завжди поточний формат: версію ставить код, а не
     вхідні дані, інакше `normalizePageConfig` повертав би «майбутній» конфіг,
     який ніхто не вміє рендерити. */
  const config: PageConfig = { version: PAGE_DATA_VERSION, zones, visibleZones };
  /* Порожній `sidebarSettings: {}` — шум у кожному рядку, а не налаштування:
     копіюємо лише тоді, коли там справді щось є. */
  if (
    source.sidebarSettings &&
    typeof source.sidebarSettings === "object" &&
    Object.keys(source.sidebarSettings as object).length > 0
  ) {
    config.sidebarSettings = source.sidebarSettings as PageConfig["sidebarSettings"];
  }
  return config;
}

/** Версії вже попереджені — щоб одне бите поле не залило консоль. */
const warnedVersions = new Set<string>();

/** Версія `page_data`, яку ми вміємо читати: рівно поточна, числами. */
function isKnownVersion(value: unknown): boolean {
  return value === PAGE_DATA_VERSION;
}

/** Один рядок у консоль на невідому версію: мовчазний `null` не діагностується. */
function warnUnknownVersion(value: unknown): void {
  const key = String(value);
  if (warnedVersions.has(key)) return;
  warnedVersions.add(key);
  console.warn(
    `[page_data] версія ${key} невідома (цей код читає ${PAGE_DATA_VERSION}) — сторінку не рендеримо`,
  );
}

/** Блоки зони: лише об'єкти з типом, з числовим порядком і нормалізованими дітьми. */
function normalizeBlocks(blocks: unknown[]): PageBlock[] {
  const result: PageBlock[] = [];
  blocks.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const block = item as Record<string, unknown>;
    if (typeof block.type !== "string" || !block.type) return;

    /* `order` може приїхати рядком із ручного JSON — `Number.isFinite("2")`
       хибне, тож без приведення порядок падав на індекс. */
    const numericOrder =
      typeof block.order === "string" && block.order.trim() !== ""
        ? Number(block.order)
        : block.order;

    const normalized: PageBlock = {
      ...(block as unknown as PageBlock),
      id: typeof block.id === "string" && block.id ? block.id : generateBlockId(),
      type: block.type,
      order:
        typeof numericOrder === "number" && Number.isFinite(numericOrder) ? numericOrder : index,
      props:
        block.props && typeof block.props === "object" && !Array.isArray(block.props)
          ? (block.props as Record<string, unknown>)
          : {},
    };
    if (Array.isArray(block.children)) {
      normalized.children = normalizeBlocks(block.children);
    }
    result.push(normalized);
  });
  return result;
}

/**
 * Конвертує старий формат web_config у новий PageConfig.
 */
function convertOldFormat(old: Record<string, unknown>): PageConfig {
  const slots = (old.slots as Record<string, unknown[]>) ?? {};
  const mainItems = Array.isArray(slots.main) ? slots.main : [];

  const mainBlocks: PageBlock[] = mainItems.map((item, i) => {
    const entry = item as Record<string, unknown>;
    const component = String(entry.component ?? "text");
    const props = (entry.props as Record<string, unknown>) ?? {};

    // Маппинг старих компонентів на нові типи блоків
    const typeMap: Record<string, string> = {
      Heading: "text",
      Text: "text",
      Button: "buttons",
      Image: "image",
      List: "list",
      Divider: "divider",
    };

    const type = typeMap[component] ?? "text";

    // Конвертуємо props під формат нових блоків
    const convertedProps: Record<string, unknown> = {};
    if (component === "Heading") {
      convertedProps.title = props.text ?? props.title ?? "";
      convertedProps.level = props.level ?? "h2";
    } else if (component === "Text") {
      convertedProps.content = props.text ?? props.content ?? "";
    } else if (component === "Button") {
      convertedProps.items = [
        {
          text: String(props.label ?? props.text ?? ""),
          url: String(props.href ?? props.url ?? ""),
        },
      ];
      convertedProps.layout = "row";
    } else {
      Object.assign(convertedProps, props);
    }

    return {
      id: generateBlockId(),
      type,
      order: i,
      props: convertedProps,
    };
  });

  return {
    version: PAGE_DATA_VERSION,
    zones: {
      sidebar: [],
      header: [],
      main: mainBlocks,
      footer: [],
    },
  };
}

/**
 * Генерація UUID v4 (для id блоків).
 */
export function generateBlockId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
