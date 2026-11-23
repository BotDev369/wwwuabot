// @vitest-environment jsdom
/**
 * Хедер на кожному екрані — без винятків: тест іде по всьому реєстру й будує
 * хедер тією самою функцією, що й каркас. Сторінки контенту перевіряються
 * окремо — їхні адреси в реєстрі не живуть.
 *
 * @module web-platform-dev/src/layout/shell-chrome.dom.test
 */

/// <reference types="node" />

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SCREENS, screenChain, type ScreenRow } from "@wwwuabot/shared/screens";
import { AppBar } from "@wwwuabot/ui/nav";
import { EMPTY_SHELL_CHROME, shellChromeFor } from "./shell-chrome";

// `import.meta.url` у jsdom — HTTP-адреса, тож корінь беремо з робочої теки.
const REPO_ROOT = process.cwd();

/** Той самий реєстр, що віддає `GET /api/screens`, але без запиту. */
const ROWS: readonly ScreenRow[] = SCREENS.map((screen) => ({
  key: screen.key,
  parentKey: screen.parent,
  title: screen.title,
  icon: screen.icon,
  sortOrder: screen.sort,
  inMenu: screen.inMenu,
  texts: {},
}));

const BY_KEY = new Map(ROWS.map((row) => [row.key, row]));

/** Шаблон адреси → конкретна адреса: `:id` стає `1`. */
function concretePath(path: string): string {
  return path.replace(/:([A-Za-z]+)/g, "1");
}

/** Хедер для адреси так, як його будує каркас. */
function renderBar(pathname: string, title: string | null = null): HTMLElement {
  const chrome = shellChromeFor(
    title === null ? undefined : { ...EMPTY_SHELL_CHROME, title },
    ROWS,
    pathname,
  );
  const { container, unmount } = render(
    <AppBar chrome={chrome} onMenu={() => undefined} onNavigate={() => undefined} />,
  );
  const trail = container.querySelector(".wb-appbar__trail");
  if (!trail) {
    unmount();
    throw new Error(`no trail for ${pathname}`);
  }
  const snapshot = trail.cloneNode(true) as HTMLElement;
  unmount();
  return snapshot;
}

/** Підписи рівнів у знімку рядка крошок. */
function crumbLabels(trail: HTMLElement): string[] {
  return [...trail.querySelectorAll(".wb-appbar__crumb")].map(
    (node) => node.textContent?.trim() ?? "",
  );
}

describe("хедер на кожному екрані реєстру", () => {
  it("реєстр не порожній — інакше перевірка нічого не доводить", () => {
    expect(SCREENS.length).toBeGreaterThanOrEqual(40);
    for (const screen of SCREENS) {
      expect(screen.path, screen.key).not.toBeNull();
    }
  });

  it("усі 41 екран мають ПАЛЯНИЦЯ і непорожні крохи з першого кадру", () => {
    for (const screen of SCREENS) {
      const path = concretePath(screen.path as string);
      const chrome = shellChromeFor(undefined, ROWS, path);

      // Бренд є на кожному екрані — його малює сам хедер, а не сторінка.
      const { container, unmount } = render(
        <AppBar chrome={chrome} onMenu={() => undefined} onNavigate={() => undefined} />,
      );
      const brand = container.querySelector(".wb-appbar__brand-name")?.textContent;
      const trailNode = container.querySelector(".wb-appbar__trail");
      const trailText = trailNode?.textContent?.trim() ?? "";
      const crumbs = [...container.querySelectorAll(".wb-appbar__crumb")];

      expect(brand, screen.key).toBe("ПАЛЯНИЦЯ");
      expect(trailNode, screen.key).not.toBeNull();
      expect(trailText, screen.key).not.toBe("");
      expect(crumbs.length, screen.key).toBeGreaterThan(0);

      for (const crumb of crumbs) {
        // Жирне накреслення не задається ні розміткою, ні класом-модифікатором.
        expect(crumb.getAttribute("style"), screen.key).toBeNull();
        expect((crumb.textContent ?? "").trim(), screen.key).not.toBe("");
      }

      // Останній рівень — назва цього екрана; батьки — його ланцюжок із реєстру.
      const expected = screenChain(screen.key).map(
        (step) => BY_KEY.get(step.key)?.title ?? step.title,
      );
      expect(crumbLabels(trailNode as HTMLElement), screen.key).toEqual(expected);

      unmount();
    }
  });

  it("крохи не жирні: жодне правило рівня не просить bold", () => {
    const css = readFileSync(join(REPO_ROOT, "packages/shared/src/styles/app-chrome.css"), "utf8");
    const blocks = [...css.matchAll(/([^{}]*\.wb-appbar__crumb[^{}]*)\{([^{}]*)\}/g)].map(
      (match) => ({ selector: match[1].trim(), body: match[2] }),
    );

    expect(blocks.length).toBeGreaterThanOrEqual(3);
    for (const { selector, body } of blocks) {
      const weight = body.match(/font-weight:\s*([^;]+);/)?.[1]?.trim();
      // Або накреслення не задане взагалі, або це regular — і ніколи bold.
      expect(
        weight === undefined || weight === "var(--weight-regular)",
        `${selector}: ${weight ?? "—"}`,
      ).toBe(true);
    }
  });

  it("вітрина `/` — теж екран реєстру з крохами «Вхід»", () => {
    const trail = renderBar("/");

    expect(crumbLabels(trail)).toEqual(["Вхід"]);
  });

  it("сторінки контенту мають крохи ще до завантаження сценарію", () => {
    for (const path of ["/galyashop", "/viruvannia/a1", "/viruvannia/b2"]) {
      const trail = renderBar(path);
      const labels = crumbLabels(trail);

      expect(labels.length, path).toBeGreaterThan(0);
      expect(
        labels.every((label) => label !== ""),
        path,
      ).toBe(true);
      expect(labels[0], path).toBe("Сторінки");
    }

    // Коли назва приїхала, рівень сторінки стає другим, а «Сторінки» лишається.
    expect(crumbLabels(renderBar("/galyashop", "GalyaShop"))).toEqual(["Сторінки", "GalyaShop"]);
  });
});
