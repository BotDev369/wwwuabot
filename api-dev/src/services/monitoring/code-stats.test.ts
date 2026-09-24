/**
 * Тести правил, за якими файли стають показниками.
 *
 * Тут захищається не арифметика, а **рішення**: що взагалі входить у метрику.
 * Якщо колись із списку випаде `package-lock.json` або туди потрапить
 * `node_modules`, числа зростуть самі по собі, і жоден інший гейт цього не
 * побачить.
 *
 * @module api-dev/src/services/monitoring/code-stats.test
 */

import { describe, expect, it } from "vitest";
import { TOTAL_GROUP } from "@wwwuabot/shared/monitoring";
import { aggregate, toMetricValues } from "./code-stats";
import { commentStyleFor, isCountedPath, workspaceOf } from "./file-filter";

describe("що входить у показники", () => {
  it.each([
    "api-dev/src/router.ts",
    "packages/shared/src/monitoring/metrics.ts",
    "web-admin-dev/src/index.css",
    "docs/MONITORING.md",
    "README.md",
    ".github/workflows/deploy.yml",
    "scripts/check-db.mjs",
    "api-dev/wrangler.toml",
    "scripts/migrations/2026-09-19-x.sql",
  ])("рахує «%s»", (path) => {
    expect(isCountedPath(path)).toBe(true);
  });

  it.each([
    "node_modules/react/index.js",
    "api-dev/dist/assets/index.js",
    "package-lock.json",
    "bun.lockb",
    "web-admin-dev/public/logo.png",
    "api-dev/vendor/lib.min.js",
    "web-platform-dev/src/app.ts.map",
  ])("не рахує «%s»", (path) => {
    expect(isCountedPath(path)).toBe(false);
  });
});

describe("стиль коментарів", () => {
  it("визначається за розширенням", () => {
    expect(commentStyleFor("a.ts")).toBe("slash");
    expect(commentStyleFor("a.yml")).toBe("hash");
    expect(commentStyleFor("a.sql")).toBe("dash");
    expect(commentStyleFor("a.md")).toBe("none");
  });
});

describe("групи", () => {
  it("перша тека стає групою, невідома — коренем", () => {
    expect(workspaceOf("api-dev/src/index.ts")).toBe("api-dev");
    expect(workspaceOf("packages/shared/src/index.ts")).toBe("packages");
    expect(workspaceOf("wrangler.toml")).toBe("root");
    expect(workspaceOf("tmp/build.ts")).toBe("root");
  });

  it("суми груп сходяться з `total`, а `code_lines` рахуються без коментарів", () => {
    const files = [
      { path: "api-dev/a.ts", bytes: 100, lines: 10, blank: 2, comment: 3 },
      { path: "api-dev/b.ts", bytes: 50, lines: 5, blank: 1, comment: 1 },
      { path: "docs/x.md", bytes: 10, lines: 2, blank: 0, comment: 0 },
    ];

    const { groups, total } = aggregate(files);
    // `code_lines` = усі рядки мінус порожні й коментарі: 15 − 3 − 4 = 8.
    expect(groups["api-dev"]).toEqual({
      files: 2,
      bytes: 150,
      lines: 15,
      code: 8,
      comment: 4,
      blank: 3,
    });
    expect(groups.docs).toEqual({ files: 1, bytes: 10, lines: 2, code: 2, comment: 0, blank: 0 });
    expect(total).toEqual({ files: 3, bytes: 160, lines: 17, code: 10, comment: 4, blank: 3 });
    expect(total.files).toBe(groups["api-dev"].files + groups.docs.files);
  });

  it("віддає значення зрізу: `total` плюс кожна група", () => {
    const values = toMetricValues([
      { path: "api-dev/a.ts", bytes: 100, lines: 10, blank: 2, comment: 3 },
      { path: "docs/x.md", bytes: 10, lines: 2, blank: 0, comment: 0 },
    ]);

    const groups = [...new Set(values.map((value) => value.group))].sort();
    expect(groups).toEqual([TOTAL_GROUP, "api-dev", "docs"].sort());

    const totalFiles = values.find(
      (value) => value.group === TOTAL_GROUP && value.metric === "code.files",
    );
    expect(totalFiles?.value).toBe(2);
  });

  it("порожній репозиторій не падає", () => {
    const values = toMetricValues([]);
    expect(values.every((value) => value.value === 0)).toBe(true);
    expect(values.length).toBeGreaterThan(0);
  });
});
