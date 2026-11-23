/**
 * Довідник усіх пошукових слів: сторінка — акордеон, у ньому підсторінки й
 * товари, а всередині — самі слова. Усі закриті: це не відповідь на запит.
 *
 * Дерево будується з індексу пошуку — окремого сховища немає.
 *
 * @module bot-dev/src/modules/search/words-screen
 */

import type { SearchEntry, SearchIndex } from "@wwwuabot/shared/search";

/** Вузол дерева: сторінка/товар і його діти (підсторінки або товари магазину). */
export interface TermsNode {
  key: string;
  title: string;
  kind: "page" | "product";
  terms: string[];
  children: TermsNode[];
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanTerms(terms: readonly string[]): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const term of terms) {
    const value = term.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    list.push(value);
  }
  return list;
}

/** Найближчий предок адреси: `viruvannia/sto-vidsotkiv` → `viruvannia`. */
function parentSlug(slug: string): string | null {
  const cut = slug.lastIndexOf("/");
  return cut > 0 ? slug.slice(0, cut) : null;
}

function nodeOf(entry: SearchEntry, key: string): TermsNode {
  return {
    key,
    title: entry.title.trim() || key,
    kind: entry.kind,
    terms: cleanTerms(entry.terms),
    children: [],
  };
}

function linkPages(
  pageNodes: TermsNode[],
  pages: Map<string, TermsNode>,
  roots: TermsNode[],
): void {
  for (const node of pageNodes) {
    let parent = node.key.includes("/") ? parentSlug(node.key) : null;
    let host: TermsNode | undefined;
    // Предок міг не потрапити в індекс (прихований або видалений): тоді
    // піднімаємось вище, а не губимо сторінку з довідника.
    while (parent) {
      host = pages.get(parent);
      if (host) break;
      parent = parentSlug(parent);
    }
    if (host) host.children.push(node);
    else roots.push(node);
  }
}

function linkProducts(
  entries: readonly SearchEntry[],
  pages: Map<string, TermsNode>,
  roots: TermsNode[],
): void {
  const synthetic = new Map<string, TermsNode>();

  for (const entry of entries) {
    if (entry.kind !== "product") continue;
    const node = nodeOf(entry, entry.shopSlug ? `${entry.shopSlug}/p/${entry.slug}` : entry.slug);
    const shop = entry.shopSlug?.trim();
    if (!shop) {
      roots.push(node);
      continue;
    }

    const host = pages.get(shop) ?? synthetic.get(shop);
    if (host) {
      host.children.push(node);
      continue;
    }

    // Магазин не потрапив в індекс, а товар потрапив: товар усе одно показуємо,
    // інакше довідник брехав би про повноту.
    const group: TermsNode = {
      key: `shop:${shop}`,
      title: entry.subtitle?.trim() || shop,
      kind: "page",
      terms: [],
      children: [node],
    };
    synthetic.set(shop, group);
    roots.push(group);
  }
}

/** Дерево довідника: корені — сторінки верхнього рівня, далі підсторінки й товари. */
export function termsTree(entries: readonly SearchEntry[]): TermsNode[] {
  const roots: TermsNode[] = [];
  const pages = new Map<string, TermsNode>();
  const pageNodes: TermsNode[] = [];

  for (const entry of entries) {
    if (entry.kind !== "page" || pages.has(entry.slug)) continue;
    const node = nodeOf(entry, entry.slug);
    pages.set(entry.slug, node);
    pageNodes.push(node);
  }

  linkPages(pageNodes, pages, roots);
  linkProducts(entries, pages, roots);
  return roots;
}

function nodeHtml(node: TermsNode): string {
  const words = node.terms.map(esc).join(" · ");
  const parts = [
    `<details><summary>${esc(node.title)}</summary>`,
    words ? `<p>${words}</p>` : `<p>слова не задані</p>`,
  ];
  for (const child of node.children) parts.push(nodeHtml(child));
  parts.push("</details>");
  return parts.join("");
}

/** HTML довідника; порожній індекс — теж відповідь, а не порожнє повідомлення. */
export function wordsScreenHtml(index: SearchIndex): string {
  const roots = termsTree(index.entries);
  const head = "<h2>Пошукові слова</h2><p>Натисніть на назву, щоб побачити слова.</p>";
  if (roots.length === 0) return `${head}<p>Слова ще не зібрані.</p>`;
  return head + roots.map(nodeHtml).join("");
}
