/**
 * Каркас панелі: **єдина навігація — сайдбар**.
 *
 * Футер був другою копією тих самих розділів унизу й займав місце на телефоні;
 * заголовки секцій у меню повторювали пункти під ними. Обидві речі повертаються
 * одним рядком — тож тут сторожі, а не коментар.
 *
 * @module web-admin-dev/src/layout/shell
 */

/// <reference types="node" />

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { useAdminNav } from "./Sidebar/adminNav.store";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

function source(path: string): string {
  return readFileSync(join(REPO_ROOT, path), "utf8");
}

describe("каркас панелі", () => {
  it("нижнього футера немає — навігація тільки в сайдбарі", () => {
    const shell = source("web-admin-dev/src/layout/AppShell.tsx");

    expect(shell).not.toContain("TabBar");
    expect(shell).not.toContain("tabbar");
  });

  it("меню — один список без заголовків секцій", () => {
    const sections = useAdminNav.getState().sections;

    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBeNull();
    // Усі розділи панелі лишаються в меню: воно тепер єдиний вхід.
    expect(sections[0].items.length).toBeGreaterThanOrEqual(7);
  });

  it("знаки меню — акцентні, правило живе у спільному CSS", () => {
    expect(source("packages/shared/src/styles/app-chrome.css")).toContain(
      ".wb-nav--accent-icons .wb-nav-icon",
    );
    expect(source("web-admin-dev/src/layout/Sidebar/Sidebar.tsx")).toContain(
      "wb-nav--accent-icons",
    );
  });
});
