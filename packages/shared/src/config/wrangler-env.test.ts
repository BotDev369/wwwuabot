/**
 * Сторож середовищ: **ім'я воркера, `ENVIRONMENT` і база мусять збігатися**.
 *
 * Навіщо тест на конфіг — бо цю помилку не ловить ніщо інше. 12.09.2026
 * воркер `bot-dev` отримав `ENVIRONMENT = "production"`: компіляція чиста,
 * тести зелені, деплой успішний — а події в Sentry і логи їхали з міткою
 * прода, хоч прода не існує. Розбіжність видно **тільки** порівнянням
 * конфігів, тож саме це тут і робиться.
 *
 * Правила:
 *
 * 1. Кожен воркер оголошує `ENVIRONMENT` — щоб середовище не «замовчувалось».
 * 2. Ім'я `*-dev` → `dev`; будь-яке інше ім'я → `production`.
 * 3. У дев-воркері `database_name` мусить містити `-dev` (правило §7 в
 *    `AGENTS.md`: не змішувати prod/dev бази).
 *
 * Правила працюють на **будь-якому** знайденому `wrangler.toml`, тому перший
 * же прод-воркер підпаде під них автоматично.
 *
 * @module packages/shared/src/config/wrangler-env.test
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ENV_DEV, ENV_PRODUCTION } from "./environment";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));

/** Теки, які не є воркерами, навіть якщо колись отримають `wrangler.toml`. */
const NOT_WORKERS = new Set(["node_modules", "packages", "docs", ".git", ".github"]);

interface WorkerConfig {
  dir: string;
  name: string;
  environment: string | null;
  databaseName: string | null;
}

/** Перше значення ключа верхнього рівня (до першої `[table]`). */
function topLevelValue(text: string, key: string): string | null {
  const match = text.match(new RegExp(`^${key}\\s*=\\s*"(.*)"\\s*$`, "m"));
  return match ? match[1] : null;
}

function readWorkers(): WorkerConfig[] {
  return readdirSync(REPO_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !NOT_WORKERS.has(entry.name))
    .map((entry) => entry.name)
    .filter((dir) => existsSync(join(REPO_ROOT, dir, "wrangler.toml")))
    .sort()
    .map((dir) => {
      const text = readFileSync(join(REPO_ROOT, dir, "wrangler.toml"), "utf8");
      return {
        dir,
        name: topLevelValue(text, "name") ?? "",
        environment: topLevelValue(text, "ENVIRONMENT"),
        // `database_name` — це `name` у `[[d1_databases]]`, другий за файлом.
        databaseName: text.match(/database_name\s*=\s*"(.*)"/)?.[1] ?? null,
      };
    });
}

const workers = readWorkers();

describe("конфіги воркерів", () => {
  it("знаходить усі 4 воркери", () => {
    // Якщо тест раптом бачить менше — зламався пошук, а не конфіги.
    expect(workers.map((w) => w.dir)).toEqual([
      "api-dev",
      "bot-dev",
      "web-admin-dev",
      "web-platform-dev",
    ]);
  });

  it.each(workers)("$dir оголошує ENVIRONMENT", (worker) => {
    expect(worker.environment, `${worker.dir}/wrangler.toml без ENVIRONMENT`).not.toBeNull();
  });

  it.each(workers)("$dir: ім'я не суперечить ENVIRONMENT", (worker) => {
      const expected = worker.name.endsWith("-dev") ? ENV_DEV : ENV_PRODUCTION;

    expect(
      worker.environment,
      `воркер «${worker.name}» мусить мати ENVIRONMENT = "${expected}"`,
    ).toBe(expected);
  });

  it.each(workers)("$dir: дев-воркер не дивиться в прод-базу", (worker) => {
    if (worker.environment !== ENV_DEV || !worker.databaseName) return;

    expect(
      worker.databaseName,
      `дев-воркер «${worker.name}» прив'язаний до бази «${worker.databaseName}»`,
    ).toContain("-dev");
  });
});
