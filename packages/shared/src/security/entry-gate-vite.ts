/**
 * Vite-плагін гейта: вставляє спільний скрипт і стилі в `index.html` оболонки.
 * Сторінки не тримають власних копій — лише розмітку блока зі своїм текстом.
 *
 * @module packages/shared/src/security/entry-gate-vite
 */

import { ENTRY_GATE_STYLES, entryGateScript, type EntryGateOptions } from "./entry-gate.ts";

/** Один тег, який Vite вставить у документ. */
export interface EntryGateTag {
  tag: string;
  children: string;
  injectTo: "head" | "body-prepend";
  attrs?: Record<string, string>;
}

/** Стилі — в голову, скрипт — першим у тіло: тоді блок стоїть до `#root`. */
export function entryGateTags(options: EntryGateOptions = {}): EntryGateTag[] {
  return [
    { tag: "style", children: ENTRY_GATE_STYLES, injectTo: "head" },
    {
      tag: "script",
      children: entryGateScript(options),
      injectTo: "body-prepend",
      attrs: { id: "entry-gate" },
    },
  ];
}

/** Плагін для `plugins` у `vite.config.ts` оболонки. */
export function entryGatePlugin(options: EntryGateOptions = {}) {
  return {
    name: "entry-gate",
    enforce: "pre" as const,
    transformIndexHtml() {
      return entryGateTags(options);
    },
  };
}
