/**
 * Спільний гейт: вибір «Mini App чи веб», ін'єкція стилів і скрипта, і те, що
 * жодна оболонка не тримає власної копії.
 *
 * @module packages/shared/src/security/entry-gate.test
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ENTRY_GATE_FILE, ENTRY_GATE_STYLES, entryGateScript } from "./entry-gate";
import { entryGatePlugin, entryGateTags } from "./entry-gate-vite";
import { WEB_BLOCK_ATTR } from "./mini-app";

const PUBLIC_HOST = "web-platform-dev.diskomate.workers.dev";

function blocked(
  script: string,
  options: {
    hostname?: string;
    search?: string;
    initData?: string;
    storage?: Record<string, string>;
  },
): boolean {
  const attrs = new Set<string>();
  const document = { documentElement: { setAttribute: (name: string) => attrs.add(name) } };
  const window = {
    Telegram: options.initData ? { WebApp: { initData: options.initData } } : undefined,
  };
  const location = { hostname: options.hostname ?? PUBLIC_HOST, search: options.search ?? "" };
  const sessionStorage = { getItem: (key: string) => options.storage?.[key] ?? null };
  new Function("window", "location", "sessionStorage", "document", script)(
    window,
    location,
    sessionStorage,
    document,
  );
  return attrs.has(WEB_BLOCK_ATTR);
}

const PLATFORM = entryGateScript({ preview: true });
const ADMIN = entryGateScript();

describe("спільний скрипт гейта", () => {
  it("у Mini App продукт показуємо", () => {
    expect(blocked(PLATFORM, { initData: "hash=abc" })).toBe(false);
    expect(blocked(ADMIN, { initData: "hash=abc" })).toBe(false);
  });

  it("у публічному браузері без підпису — блок", () => {
    expect(blocked(PLATFORM, {})).toBe(true);
    expect(blocked(ADMIN, {})).toBe(true);
  });

  it("локальна розробка не блокується", () => {
    expect(blocked(PLATFORM, { hostname: "localhost" })).toBe(false);
    expect(blocked(ADMIN, { hostname: "127.0.0.1" })).toBe(false);
  });

  it("ключ прев'ю знімає блок лише в платформи", () => {
    expect(blocked(PLATFORM, { search: "?preview=ключ" })).toBe(false);
    expect(blocked(PLATFORM, { storage: { "preview-session-key": "ключ" } })).toBe(false);
    expect(blocked(ADMIN, { search: "?preview=ключ" })).toBe(true);
  });
});

describe("спільні стилі гейта", () => {
  it("ховають продукт і показують блок", () => {
    expect(ENTRY_GATE_STYLES).toContain("html[data-web-block] #root{display:none}");
    expect(ENTRY_GATE_STYLES).toContain(".wb-entry-block{display:none}");
    expect(ENTRY_GATE_STYLES).toContain("html[data-web-block] .wb-entry-block{display:flex");
  });
});

describe("Vite-плагін гейта", () => {
  it("ставить стилі в голову, а посилання на скрипт — першим у тіло", () => {
    const tags = entryGateTags({ preview: true });
    expect(tags.map((tag) => [tag.tag, tag.injectTo])).toEqual([
      ["style", "head"],
      ["script", "body-prepend"],
    ]);
    expect(tags[0].children).toBe(ENTRY_GATE_STYLES);
    // Інлайн CSP забороняє: `script-src 'self'` без `'unsafe-inline'`.
    expect(tags[1].children).toBeUndefined();
    expect(tags[1].attrs).toEqual({ id: "entry-gate", src: `/${ENTRY_GATE_FILE}` });
  });

  it("віддає ті самі теги з хука трансформації HTML", () => {
    const plugin = entryGatePlugin();
    expect(plugin.name).toBe("entry-gate");
    expect(plugin.transformIndexHtml()).toEqual(entryGateTags());
  });

  it("кладе скрипт окремим файлом у корінь білда", () => {
    const files: { type: string; fileName: string; source: string }[] = [];
    const emitFile = (file: { type: string; fileName: string; source: string }) => {
      files.push(file);
      return "ref";
    };
    entryGatePlugin({ preview: true }).generateBundle.call({ emitFile });

    expect(files).toEqual([{ type: "asset", fileName: ENTRY_GATE_FILE, source: PLATFORM }]);
  });

  it("у деві віддає той самий файл, а не 404", () => {
    type Handler = (
      req: unknown,
      res: { setHeader(name: string, value: string): void; end(body?: string): void },
      next: () => void,
    ) => void;
    let handler: Handler | undefined;
    let path: string | undefined;
    const server = {
      middlewares: {
        use: (url: string, fn: Handler) => {
          path = url;
          handler = fn;
        },
      },
    };
    entryGatePlugin({ preview: true }).configureServer(server);

    const sent: { headers: Record<string, string>; body?: string } = { headers: {} };
    handler?.(
      {},
      {
        setHeader: (name: string, value: string) => (sent.headers[name] = value),
        end: (body?: string) => (sent.body = body),
      },
      () => {},
    );

    expect(path).toBe(`/${ENTRY_GATE_FILE}`);
    expect(sent.headers["Content-Type"]).toContain("text/javascript");
    expect(sent.body).toBe(PLATFORM);
  });
});

describe("оболонки", () => {
  it("не тримають власних копій гейта й лишають розмітку блока", () => {
    for (const file of ["web-platform-dev/index.html", "web-admin-dev/index.html"]) {
      const html = readFileSync(new URL(`../../../../${file}`, import.meta.url), "utf8");
      expect(html, file).not.toContain('id="entry-gate"');
      expect(html, file).not.toContain("html[data-web-block]");
      expect(html, file).toContain('class="wb-entry-block"');
    }
  });
});
