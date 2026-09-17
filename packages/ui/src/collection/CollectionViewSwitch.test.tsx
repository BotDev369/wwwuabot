/**
 * Клітинка «відображення» — розмітка й кирпичик.
 *
 * Перевіряємо те, що легко зламати мовчки: що клітинка **не показує поточний
 * вибір собою** (знак один і той самий, а вибране читає `aria-label` і видно
 * чипом поруч — так само зроблено з трьома виборами нотаток), що поверхня
 * відкривається саме пікером (`MenuModal`), і що це **спільний** кирпичик:
 * його клітинка — та сама, що у вкладок композера (одне правило на всіх), і
 * мірку вона дістає від ряду, а не носить свою.
 *
 * Одна річ перевіряється **разом із CSS**: що розкладку тримає кирпичик
 * `.wb-collection*`, а не список. Два `display` на одному елементі означали б,
 * що вибір вигляду залежить від порядку правил у файлі — тобто випадковий.
 * Так само зроблено в `notes/NotesList.test.tsx`.
 */

/// <reference types="node" />

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CollectionViewSwitch } from "./CollectionViewSwitch";
import { DEFAULT_COLLECTION_VIEW, type CollectionView } from "./types";

const CSS = readFileSync(
  join(
    fileURLToPath(new URL("../../../../", import.meta.url)),
    "packages/shared/src/styles/components.css",
  ),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

/** Усі тіла правил за селектором: той самий клас стоїть і в списку клітинок. */
function rules(selector: string): string[] {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...CSS.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "g"))].map((match) => match[1]);
}

/** Тіло правила за селектором — щоб перевіряти саме його, а не файл цілком. */
function rule(selector: string): string {
  return rules(selector)[0] ?? "";
}

function render(view: CollectionView = DEFAULT_COLLECTION_VIEW): string {
  return renderToStaticMarkup(<CollectionViewSwitch view={view} onChange={() => {}} />);
}

describe("CollectionViewSwitch", () => {
  it("клітинка без підпису: ім'я і поточний вибір читає aria-label", () => {
    const html = render();

    expect(html).toContain('class="wb-collection-tool"');
    expect(html).toContain('aria-label="Відображення: Рядки"');
    expect(html).not.toContain("wb-btn");
  });

  it("вибір не переїжджає на сам знак: у клітинці лише знак, і він сталий", () => {
    // «Що вибрано» показує чип поруч — так само, як у трьох виборів нотаток.
    // Знак, що міняється від стану, зробив би з клітинки другий перемикач.
    const rows = render({ layout: "rows", columns: 2 });
    const cards = render({ layout: "cards", columns: 2 });

    expect(rows).toContain('aria-label="Відображення: Рядки"');
    expect(cards).toContain('aria-label="Відображення: Картки — 2 колонки"');
    expect(render({ layout: "cards", columns: 1 })).toContain(
      'aria-label="Відображення: Картки — 1 колонка"',
    );
    expect(rows.match(/<svg[\s\S]*?<\/svg>/)?.[0]).toBe(cards.match(/<svg[\s\S]*?<\/svg>/)?.[0]);
  });

  it("пікер закритий, доки його не відкрили — жодних пунктів у списку", () => {
    expect(render()).not.toContain("wb-menu-list");
  });

  it("клітинка — та сама, що у вкладок композера: одне правило на всіх", () => {
    // Інакше «зробити як вкладки» довелося б повторювати, і воно б розійшлося.
    const base = rule(".wb-collection-tool");

    expect(base).toContain("display: flex");
    expect(base).toContain("border: none");
    expect(base).toContain("cursor: pointer");
    expect(rule(".wb-collection-tool:hover")).toContain("background: var(--surface-hover)");
  });

  it("мірку клітинка бере від ряду, а не носить свою", () => {
    // У смузі нотаток контроли однієї висоти: своя мірка в клітинки означала б,
    // що вона випадає з ряду, щойно ряд стане нижчим або вищим.
    const sized = rules(".wb-collection-tool").find((body) => body.includes("width:")) ?? "";

    expect(sized).toContain("width: var(--cell");
    expect(sized).toContain("height: var(--cell");
  });

  it("розкладку тримає кирпичик, а не список: плитки — від вибраних колонок", () => {
    expect(rule(".wb-collection")).toContain("display: grid");
    expect(rule(".wb-collection--cards")).toContain(
      "repeat(var(--collection-cols, 2), minmax(0, 1fr))",
    );
    expect(rule(".wb-collection--cols-1")).toContain("--collection-cols: 1");
    expect(rule(".wb-collection--cols-2")).toContain("--collection-cols: 2");
    // Список нотаток розкладки не задає — інакше два `display` билися б.
    expect(rule(".wb-note-list")).not.toContain("display");
  });
});
