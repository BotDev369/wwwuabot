/**
 * Правило дотику в меню — те, що легко зламати мовчки.
 *
 * Пункт меню має рівно три долі: своя дія, перехід за адресою або чесна
 * заглушка. Переплутати їх місцями означало б, що пункт веде не туди (або не
 * робить нічого) — і код при цьому компілюється.
 */

import { describe, expect, it, vi } from "vitest";
import { buildMenuItems } from "./build-items";
import type { ShellMenuItem } from "./types";

const OPTS = { navigate: vi.fn(), onPlaceholder: vi.fn() };

function build(items: ShellMenuItem[], overrides: Partial<typeof OPTS> = {}) {
  return buildMenuItems({ items, ...OPTS, ...overrides });
}

describe("buildMenuItems", () => {
  it("пункт з адресою веде на неї", () => {
    const navigate = vi.fn();
    const [item] = build([{ key: "notes", label: "МоїНотатки", icon: "text", href: "/notes" }], {
      navigate,
    });

    item.onSelect();
    expect(navigate).toHaveBeenCalledWith("/notes");
  });

  it("своя дія має пріоритет над адресою", () => {
    // Панель теми відкривається всередині модалки: якби адреса перемагала,
    // дотик виносив би людину з меню на зовсім інший екран.
    const navigate = vi.fn();
    const open = vi.fn();
    const [item] = build([{ key: "theme", label: "Тема", icon: "sliders", onSelect: open }], {
      navigate,
    });

    item.onSelect();
    expect(open).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("пункт без адреси й без дії стає заглушкою, а не тишею", () => {
    const onPlaceholder = vi.fn();
    const [item] = build(
      [{ key: "pages", label: "МоїСторінки", icon: "layout", status: "soon", hint: "буде" }],
      { onPlaceholder },
    );

    item.onSelect();
    expect(onPlaceholder).toHaveBeenCalledOnce();
    // Пояснення доїжджає до оболонки: саме його вона показує в діалозі.
    expect(onPlaceholder.mock.calls[0][0].hint).toBe("буде");
  });

  it("стан пункту не губиться: вибір і заглушка доїжджають до розмітки", () => {
    const [selected, soon] = build([
      { key: "brand-apple", label: "Apple", icon: "grid", selected: true, onSelect: vi.fn() },
      { key: "contacts", label: "МоїКонтакти", icon: "mail", status: "soon", onSelect: vi.fn() },
    ]);

    expect(selected.selected).toBe(true);
    expect(soon.status).toBe("soon");
  });

  it("склад пунктів не переставляється", () => {
    // Порядок — це те, що задає оболонка (згори вниз), і він не справа меню.
    const keys = build([
      { key: "a", label: "A", icon: "text" },
      { key: "b", label: "B", icon: "text", href: "/b" },
      { key: "c", label: "C", icon: "text" },
    ]).map((item) => item.key);

    expect(keys).toEqual(["a", "b", "c"]);
  });
});
