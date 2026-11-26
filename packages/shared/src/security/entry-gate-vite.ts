/**
 * Vite-плагін гейта: вставляє спільні стилі й посилання на скрипт у
 * `index.html` оболонки. Сторінки не тримають власних копій — лише розмітку
 * блока. Скрипт — окремий файл, а не інлайн: CSP дозволяє лише `'self'`.
 *
 * @module packages/shared/src/security/entry-gate-vite
 */

import {
  ENTRY_GATE_FILE,
  ENTRY_GATE_STYLES,
  entryGateScript,
  type EntryGateOptions,
} from "./entry-gate.ts";

/** Один тег, який Vite вставить у документ. */
export interface EntryGateTag {
  tag: string;
  children?: string;
  injectTo: "head" | "body-prepend";
  attrs?: Record<string, string>;
}

/** Мінімум контексту Rollup, який потрібен плагіну для емісії файла. */
interface AssetEmitter {
  emitFile(file: { type: "asset"; fileName: string; source: string }): string;
}

/** Мінімум connect-сервера Vite, який потрібен плагіну в деві. */
interface DevServerLike {
  middlewares: {
    use(
      path: string,
      handler: (
        req: unknown,
        res: { setHeader(name: string, value: string): void; end(body?: string): void },
        next: () => void,
      ) => void,
    ): void;
  };
}

/** Стилі — в голову, посилання на скрипт — першим у тіло: тоді блок до `#root`. */
export function entryGateTags(_options: EntryGateOptions = {}): EntryGateTag[] {
  return [
    { tag: "style", children: ENTRY_GATE_STYLES, injectTo: "head" },
    {
      tag: "script",
      injectTo: "body-prepend",
      attrs: { id: "entry-gate", src: `/${ENTRY_GATE_FILE}` },
    },
  ];
}

/** Плагін для `plugins` у `vite.config.ts` оболонки. */
export function entryGatePlugin(options: EntryGateOptions = {}) {
  const script = entryGateScript(options);
  return {
    name: "entry-gate",
    enforce: "pre" as const,
    transformIndexHtml() {
      return entryGateTags(options);
    },
    /** Білд: той самий файл лягає в корінь `dist/client`, поруч з `_headers`. */
    generateBundle(this: AssetEmitter) {
      this.emitFile({ type: "asset", fileName: ENTRY_GATE_FILE, source: script });
    },
    /** Дев: та сама відповідь, щоб `index.html` не ловив 404. */
    configureServer(server: DevServerLike) {
      server.middlewares.use(`/${ENTRY_GATE_FILE}`, (_req, res, _next) => {
        res.setHeader("Content-Type", "text/javascript; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.end(script);
      });
    },
  };
}
