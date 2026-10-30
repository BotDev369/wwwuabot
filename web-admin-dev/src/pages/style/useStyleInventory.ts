/**
 * Стан інвентаря вигляду: що показати й з якими значеннями.
 *
 * Каталог приходить із CSS, живі значення — з `<html>`; тут лише вибір і
 * фільтр, жодного опису вигляду.
 *
 * @module web-admin-dev/src/pages/style/useStyleInventory
 */

import { useEffect, useMemo, useState } from "react";
import catalog from "@wwwuabot/shared/styles/catalog.json";
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

const TOKENS = catalog.tokens as StyleToken[];
const LOCALS = catalog.local as LocalToken[];
const CLASSES = catalog.classes as ClassesByFile;
const FILES = catalog.files as { file: string; tokens: number; classes: number }[];

export const CATALOG_FILES = FILES;
export const CATALOG_TOKENS = TOKENS;

/** Скільки класів у системі насправді: один клас може жити у двох файлах. */
export const CLASS_NAMES: string[] = [
  ...new Set(Object.values(CLASSES).flatMap((groups) => groups.flatMap((g) => g.names))),
].sort();

/** Класи, для яких є справжнє прев'ю, — щоб показати покриття, а не обіцянку. */
export const PREVIEWED_CLASSES = new Set(
  BRICKS.flatMap((group) => group.items.flatMap((b) => b.classes)),
);

export const BRICK_GROUPS: BrickGroup[] = BRICKS;

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
export function swatchKind(value: string, depth = 0): SwatchKind {
  const text = value.trim();
  if (!text) return "text";

  const reference = /^var\((--[a-z0-9-]+)/i.exec(text);
  if (reference && depth < 4) {
    const target = TOKENS.find((t) => t.name === reference[1]);
    if (target) return swatchKind(target.light || target.dark || target.palette, depth + 1);
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
export function useFilter() {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  const tokens = useMemo(
    () =>
      needle
        ? TOKENS.filter(
            (t) =>
              t.name.toLowerCase().includes(needle) || t.section.toLowerCase().includes(needle),
          )
        : TOKENS,
    [needle],
  );

  const locals = useMemo(
    () => (needle ? LOCALS.filter((t) => t.name.toLowerCase().includes(needle)) : LOCALS),
    [needle],
  );

  const classes = useMemo(() => {
    const out: ClassesByFile = {};
    for (const [file, groups] of Object.entries(CLASSES)) {
      const filtered = groups
        .map((group) => ({
          section: group.section,
          names: needle ? group.names.filter((n) => n.includes(needle)) : group.names,
        }))
        .filter((group) => group.names.length > 0);
      if (filtered.length) out[file] = filtered;
    }
    return out;
  }, [needle]);

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
