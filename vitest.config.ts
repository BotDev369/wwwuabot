import { existsSync } from "node:fs";
import { resolve } from "node:path";

/** Оболонки, у яких `@/` → їхній власний `src` (так само, як у `vite.config.ts`). */
const SHELL_PACKAGES = ["web-platform-dev", "web-admin-dev"];

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
    environment: "node",
    include: ["**/*.test.ts", "**/*.spec.ts", "**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.wrangler/**"],

    // Покриття рахується окремою командою: `npm test` має залишатися швидким,
    // а поріг — падати в CI. `check-coverage.mjs` порівнює підсумок із
    // мінімумом, який не можна знизити мовчки.
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary"],
      reportsDirectory: "coverage",
      include: [
        "packages/*/src/**",
        "bot-dev/src/**",
        "api-dev/src/**",
        "web-platform-dev/src/**",
        "web-admin-dev/src/**",
      ],
      exclude: ["**/*.test.*", "**/*.dom.test.*", "**/*.spec.*", "**/types/**"],
    },
  },
};
