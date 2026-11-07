/**
 * Схеми блоків проти даних: те, що не бачить ні компілятор, ні око.
 *
 * Перший тест — регресія: `text` живе самим `title`, без `content` (146 у базі).
 *
 * @module packages/shared/src/types/page-config.validate.test
 */

import { describe, expect, it } from "vitest";
import { createEmptyPageConfig } from "./page-config.utils";
import {
  countPageDataIssues,
  validatePageConfig,
  type PageDataIssue,
} from "./page-config.validate";
import type { PageBlock, PageConfig } from "./page-config.types";

/** Конфіг із блоками в `main` — решта зон порожні. */
function configWith(blocks: Partial<PageBlock>[]): PageConfig {
  const config = createEmptyPageConfig();
  config.zones.main = blocks.map((block, index) => ({
    id: `b${index}`,
    order: index,
    props: {},
    ...block,
  })) as PageBlock[];
  return config;
}

/** Знахідка за шляхом — щоб тест не залежав від порядку й кількості інших. */
function at(issues: PageDataIssue[], path: string): PageDataIssue | undefined {
  return issues.find((issue) => issue.path === path);
}

describe("validatePageConfig", () => {
  it("заголовок без content — не порушення: text живе і самим title", () => {
    const issues = validatePageConfig(
      configWith([{ type: "text", props: { title: "Масштаб", level: "h2" } }]),
    );
    expect(issues).toEqual([]);
  });

  it("правильний конфіг дає порожній список, а не «перевірку вимкнено»", () => {
    const issues = validatePageConfig(
      configWith([
        { type: "text", props: { content: "Текст" } },
        { type: "divider", props: {} },
      ]),
    );
    expect(issues).toEqual([]);
  });

  it("невідомий тип блока — помилка", () => {
    const issues = validatePageConfig(configWith([{ type: "no-such-block" }]));
    expect(at(issues, "main[0]")).toMatchObject({ severity: "error" });
    expect(at(issues, "main[0]")?.message).toContain("no-such-block");
  });

  it("значення поза списком — помилка, і `mixed` у списку є", () => {
    const broken = validatePageConfig(
      configWith([{ type: "compare-setup", props: { kind: "nope" } }]),
    );
    expect(at(broken, "main[0].props.kind")).toMatchObject({ severity: "error" });

    const mixed = validatePageConfig(
      configWith([{ type: "compare-setup", props: { kind: "mixed" } }]),
    );
    expect(at(mixed, "main[0].props.kind")).toBeUndefined();
  });

  it("поле не того типу — помилка", () => {
    const issues = validatePageConfig(
      configWith([{ type: "stat", props: { value: 5, label: "Християни" } }]),
    );
    expect(at(issues, "main[0].props.value")).toMatchObject({ severity: "error" });
  });

  it("поле поза оголошенням — попередження, а не помилка", () => {
    const issues = validatePageConfig(
      configWith([{ type: "text", props: { title: "Є", align: "left" } }]),
    );
    expect(at(issues, "main[0].props.align")).toMatchObject({ severity: "warn" });
  });

  it("порожнє обов'язкове — попередження", () => {
    const issues = validatePageConfig(
      configWith([{ type: "link-button", props: { text: "", url: "" } }]),
    );
    const paths = issues.filter((issue) => issue.severity === "warn").map((issue) => issue.path);
    expect(paths).toEqual(["main[0].props.text", "main[0].props.url"]);
  });

  it("діти перевіряються рекурсивно, зі шляхом крізь батька", () => {
    const issues = validatePageConfig(
      configWith([
        { type: "card", props: { title: "Обкладинка" }, children: [{ type: "nope" } as PageBlock] },
      ]),
    );
    expect(at(issues, "main[0].children[0]")).toMatchObject({ severity: "error" });
  });
});

describe("countPageDataIssues", () => {
  it("рахує рівні окремо", () => {
    const issues: PageDataIssue[] = [
      { path: "a", message: "x", severity: "error" },
      { path: "b", message: "y", severity: "warn" },
      { path: "c", message: "z", severity: "warn" },
    ];
    expect(countPageDataIssues(issues)).toEqual({ errors: 1, warnings: 2 });
  });

  it("порожній список — нулі", () => {
    expect(countPageDataIssues([])).toEqual({ errors: 0, warnings: 0 });
  });
});
