/**
 * Стан інвентаря вигляду: що показати й з якими значеннями.
 *
 * Каталог генерує `npm run doc:style`; у бандл він не входить — сторінка
 * забирає його окремим ресурсом (бюджет бандла). Живі значення — з `<html>`;
 * тут лише завантаження, вибір і фільтр.
 * @module web-admin-dev/src/pages/style/useStyleInventory
 */

import { useEffect, useMemo, useState } from "react";
import catalogUrl from "@wwwuabot/shared/styles/catalog.json?url";
import { BRICKS, type BrickGroup } from "./previews";

export interface StyleToken {
  name: string;
  section: string;
  light: string;
  dark: string;
  palette: string;
  paletteDark: string;
}

export interface LocalToken {
  name: string;
  file: string;
  selector: string;
  value: string;
  section: string;
}

export interface ClassGroup {
  section: string;
  names: string[];
}

export type ClassesByFile = Record<string, ClassGroup[]>;

export interface CatalogFile {
  file: string;
  tokens: number;
  classes: number;
}

export interface StyleCatalog {
  tokens: StyleToken[];
  locals: LocalToken[];
  classes: ClassesByFile;
  files: CatalogFile[];
  /** Унікальні імена класів: один клас може жити у двох файлах. */
  classNames: string[];
}

/** Форма, у якій каталог лежить на диску (див. `scripts/lib/style-catalog.mjs`). */
interface RawCatalog {
  tokens: StyleToken[];
  local: LocalToken[];
  classes: ClassesByFile;
  files: CatalogFile[];
}

export type CatalogState =
  | { status: "loading"; catalog: null }
  | { status: "error"; catalog: null }
  | { status: "ready"; catalog: StyleCatalog };

/** Кирпичики з живим прев'ю — статичні: це розмітка, а не каталог. */
export const BRICK_GROUPS: BrickGroup[] = BRICKS;

/** Класи, для яких є справжнє прев'ю, — щоб показати покриття, а не обіцянку. */
export const PREVIEWED_CLASSES = new Set(
  BRICKS.flatMap((group) => group.items.flatMap((b) => b.classes)),
);

function toCatalog(raw: RawCatalog): StyleCatalog {
  return {
    tokens: raw.tokens,
    locals: raw.local,
    classes: raw.classes,
    files: raw.files,
    classNames: [
      ...new Set(Object.values(raw.classes).flatMap((groups) => groups.flatMap((g) => g.names))),
    ].sort(),
  };
}

/**
 * Каталог приходить ресурсом, а не модулем: 133 KB JSON у бандлі коштували б
 * входу в адмінку, хоча довідник відкривають зрідка.
 */
export function useStyleCatalog(): CatalogState {
  const [state, setState] = useState<CatalogState>({ status: "loading", catalog: null });

  useEffect(() => {
    let alive = true;

    fetch(catalogUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`каталог вигляду: HTTP ${response.status}`);
        return response.json() as Promise<RawCatalog>;
      })
      .then((raw) => {
        if (alive) setState({ status: "ready", catalog: toCatalog(raw) });
      })
      .catch(() => {
        if (alive) setState({ status: "error", catalog: null });
      });

    return () => {
      alive = false;
    };
  }, []);

  return state;
}

/**
 * Живі значення токенів.
 *
 * Читаються з `<html>` і перечитуються, коли міняється схема чи палітра:
 * `MutationObserver` на атрибутах кореня — це рівно ті події, якими продукт
 * перемикає вигляд. Без цього довідник показував би значення на момент
 * відкриття й розходився з екраном після першого перемикання теми.
 */
export function useLiveTokens(names: string[]): Record<string, string> {
  const [live, setLive] = useState<Record<string, string>>({});
  const key = names.join(",");

  useEffect(() => {
    const list = key ? key.split(",") : [];

    const read = () => {
      const styles = getComputedStyle(document.documentElement);
      const next: Record<string, string> = {};
      for (const name of list) next[name] = styles.getPropertyValue(name).trim();
      setLive(next);
    };

    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-colors", "data-colors-mode", "style"],
    });
    return () => observer.disconnect();
  }, [key]);

  return live;
}

export type SwatchKind = "color" | "size" | "shadow" | "text";

const COLOR_RE = /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\(|oklch\(|color-mix\(|color\()/i;
const SIZE_RE = /^-?[\d.]+\s*(px|rem|em|%|vh|vw|dvh|ch)$/;

/**
 * Що це за значення — щоб намалювати його, а не просто надрукувати.
 *
 * `var(--x)` розкривається через каталог: без цього половина токенів (вони
 * посилаються один на одного) виглядала б як невідомий рядок.
 */
export function swatchKind(value: string, tokens: StyleToken[], depth = 0): SwatchKind {
  const text = value.trim();
  if (!text) return "text";

  const reference = /^var\((--[a-z0-9-]+)/i.exec(text);
  if (reference && depth < 4) {
    const target = tokens.find((t) => t.name === reference[1]);
    if (target) return swatchKind(target.light || target.dark || target.palette, tokens, depth + 1);
  }

  // Градієнт показуємо заливкою: `background` приймає його так само, як колір.
  if (/gradient\(/.test(text)) return "color";
  if (COLOR_RE.test(text)) return "color";
  if (SIZE_RE.test(text)) return "size";
  if (/shadow|^\d+px\s+[\d-]+px/.test(text)) return "shadow";
  if (/cubic-bezier|linear|ease/.test(text)) return "text";
  if (/^\d+(\.\d+)?$/.test(text)) return "size";
  return "text";
}

/** Токени за розділом — у порядку, у якому їх читає CSS. */
export function groupTokens(tokens: StyleToken[]): { section: string; items: StyleToken[] }[] {
  const groups = new Map<string, StyleToken[]>();
  for (const token of tokens) {
    const key = token.section || "Схема продукту";
    groups.set(key, [...(groups.get(key) ?? []), token]);
  }
  return [...groups].map(([section, items]) => ({ section, items }));
}

/** Пошук по всьому: ім'я токена, клас або файл — одне поле на три списки. */
export function useFilter(catalog: StyleCatalog | null) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  const tokens = useMemo(() => {
    const all = catalog?.tokens ?? [];
    if (!needle) return all;
    return all.filter(
      (t) => t.name.toLowerCase().includes(needle) || t.section.toLowerCase().includes(needle),
    );
  }, [catalog, needle]);

  const locals = useMemo(() => {
    const all = catalog?.locals ?? [];
    return needle ? all.filter((t) => t.name.toLowerCase().includes(needle)) : all;
  }, [catalog, needle]);

  const classes = useMemo(() => {
    const out: ClassesByFile = {};
    for (const [file, groups] of Object.entries(catalog?.classes ?? {})) {
      const filtered = groups
        .map((group) => ({
          section: group.section,
          names: needle ? group.names.filter((n) => n.includes(needle)) : group.names,
        }))
        .filter((group) => group.names.length > 0);
      if (filtered.length) out[file] = filtered;
    }
    return out;
  }, [catalog, needle]);

  const bricks = useMemo<BrickGroup[]>(() => {
    if (!needle) return BRICKS;
    return BRICKS.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.title.toLowerCase().includes(needle) ||
          item.classes.some((c) => c.toLowerCase().includes(needle)),
      ),
    })).filter((group) => group.items.length > 0);
  }, [needle]);

  return { query, setQuery, tokens, locals, classes, bricks };
}
