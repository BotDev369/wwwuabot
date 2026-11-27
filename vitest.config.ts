import { existsSync } from "node:fs";
import { resolve } from "node:path";

/** Оболонки, у яких `@/` → їхній власний `src` (так само, як у `vite.config.ts`). */
const SHELL_PACKAGES = ["web-platform-dev", "web-admin-dev"];

/** Те, що не є тестом у жодному проєкті. */
const IGNORED = ["**/node_modules/**", "**/dist/**", "**/.wrangler/**"];

/**
 * jsdom у VM-контексті віддає справжнє вікно jsdom, а не підмішані на глобал
 * Node: зникає `crypto.subtle`, а `window.location` справді `[LegacyUnforgeable]`
 * і не переозначується. Ці файли лишаються в пулі `forks`, незміненими.
 */
const VM_INCOMPATIBLE = [
  "web-platform-dev/dev/telegram-session.dom.test.ts",
  "web-admin-dev/src/layout/shell.dom.test.tsx",
  "packages/ui/src/blocks/my-dates-table/useMyDates.dom.test.ts",
];

export default {
  // Аліас оголошено в `tsconfig.app.json` і в `vite.config.ts` оболонки, але vitest
  // читає лише цей файл: без нього жоден тест оболонки не імпортує її модулів.
  // Корінь оболонки дізнаємо з самого імпортера, тож не залежимо від `cwd`.
  plugins: [
    {
      name: "shell-src-alias",
      resolveId(source: string, importer: string | undefined) {
        if (!source.startsWith("@/") || !importer) return null;
        const parts = importer.split("/");
        const at = parts.findIndex((part) => SHELL_PACKAGES.includes(part));
        if (at === -1) return null;

        const base = resolve("/", ...parts.slice(0, at + 1), "src", source.slice(2));
        // Розширення дописуємо самі: ід, який повернув плагін, vite вже не
        // перерозбирає, тож без цього файл просто не знайдеться на диску.
        for (const id of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
          if (existsSync(id)) return id;
        }
        return null;
      },
    },
  ],

  test: {
    globals: true,

    // Трансформація модулів переживає прогін: 473 файли щоразу перекладаються
    // заново (17% часу проєкту `node`), хоч між прогонами змінюється кілька
    // з них. Кеш лежить у `node_modules/.vitest-cache` і не комітиться.
    fsModuleCache: true,

    // Покриття рахується раз на весь прогін: це опція кореня, не проєкту.
    // Поріг падає в CI; `check-coverage.mjs` порівнює підсумок із мінімумом,
    // який не можна знизити мовчки.
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary"],
      reportsDirectory: "coverage",
      include: [
        "packages/*/src/**",
        "bot-dev/src/**",
        "api-dev/src/**",
        "web-platform-dev/src/**",
        "web-platform-dev/dev/**",
        "web-admin-dev/src/**",
      ],
      exclude: ["**/*.test.*", "**/*.dom.test.*", "**/*.spec.*", "**/types/**"],
    },

    // Проєкти розділені за ціною середовища. `node` — як було. `dom` — jsdom,
    // який коштує 200–500 мс на файл: у пулі `vmThreads` середовище створюється
    // раз на воркер, а кожен файл дістає свіжий VM-контекст і вікно, тож
    // спільного модульного кеша немає й тести не течуть одне в одного.
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          // `threads` швидший за `forks` на третину кроку: ті самі тести й те саме
          // покриття. Проєкт `dom` і далі на `vmThreads` (свіжий контекст на файл).
          pool: "threads",
          include: ["**/*.test.ts", "**/*.spec.ts", "**/*.test.tsx"],
          exclude: [...IGNORED, "**/*.dom.test.*"],
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          pool: "vmThreads",
          include: ["**/*.dom.test.ts", "**/*.dom.test.tsx"],
          exclude: [...IGNORED, ...VM_INCOMPATIBLE],
        },
      },
      {
        extends: true,
        test: {
          name: "dom-forks",
          environment: "jsdom",
          include: VM_INCOMPATIBLE,
        },
      },
    ],
  },
};
