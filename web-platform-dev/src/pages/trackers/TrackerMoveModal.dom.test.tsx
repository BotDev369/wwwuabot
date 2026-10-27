// @vitest-environment jsdom
/**
 * «Перемістити»: дерево місць із кнопкою «Обрати» в кожному рядку, теперішнє
 * місце каже «Тут» і не діє, а гілка, яку переміщують, у дереві не
 * показується — група не може стати під собою.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerMoveModal.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TrackerGroup } from "@wwwuabot/shared/trackers";

const hooks = {
  pick: vi.fn(),
  close: vi.fn(),
};

const { TrackerMoveModal } = await import("./TrackerMoveModal");

const routine: TrackerGroup = { id: 10, parentId: null, title: "Режим", key: "routine" };
const activity: TrackerGroup = { id: 11, parentId: null, title: "Активність", key: "activity" };
const morning: TrackerGroup = { id: 12, parentId: 11, title: "Ранкова рутина", key: null };
const own: TrackerGroup = { id: 13, parentId: null, title: "Свої", key: "own" };

function renderModal(
  options: {
    currentId?: number | null;
    rootLabel?: string;
    excludeIds?: readonly number[];
  } = {},
) {
  return render(
    <TrackerMoveModal
      name="Дім"
      groups={[routine, activity, morning, own]}
      // Типово «місце» — «Свої» (13): його в дереві немає, тож усі рядки
      // закликають «Обрати», а конкретний тест сам каже, де воно зараз.
      currentId={options.currentId === undefined ? 13 : options.currentId}
      rootLabel={options.rootLabel ?? "Верхній рівень"}
      excludeIds={options.excludeIds}
      onPick={hooks.pick}
      onClose={hooks.close}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("дерево місць", () => {
  it("корінь і групи — у рядках; підгрупа ховається під батьком", async () => {
    renderModal();

    expect(screen.getByRole("button", { name: "Обрати: Верхній рівень" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Обрати: Режим" })).toBeTruthy();
    // Згорнуте дерево не показує підгрупу — її розгортають стрілкою.
    expect(screen.queryByRole("button", { name: "Обрати: Ранкова рутина" })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Розгорнути Активність" }));

    const child = screen.getByRole("button", { name: "Обрати: Ранкова рутина" });
    const row = child.closest(".wb-group-picker-row");
    expect(row?.getAttribute("style")).toContain("margin-inline-start: 14px");
  });

  it("«Свої» — не місце для групи: у дереві його немає, лише корінь", () => {
    renderModal();

    expect(screen.queryByRole("button", { name: "Обрати: Свої" })).toBeNull();
  });

  it("«Розгорнути всі» відкриває гілки, «Згорнути всі» — закриває", async () => {
    renderModal();

    await userEvent.click(screen.getByRole("button", { name: "Розгорнути всі" }));
    expect(screen.getByRole("button", { name: "Обрати: Ранкова рутина" })).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Згорнути всі" }));
    expect(screen.queryByRole("button", { name: "Обрати: Ранкова рутина" })).toBeNull();
  });
});

describe("вибір місця", () => {
  it("кнопка рядка шле саме цю групу, корінь — «без групи»", async () => {
    renderModal();

    await userEvent.click(screen.getByRole("button", { name: "Обрати: Режим" }));
    expect(hooks.pick).toHaveBeenCalledWith(10);

    await userEvent.click(screen.getByRole("button", { name: "Обрати: Верхній рівень" }));
    expect(hooks.pick).toHaveBeenCalledWith(null);
  });

  it("теперішнє місце каже «Тут» і не діє", async () => {
    renderModal({ currentId: 11 });

    const here = screen.getByRole("button", { name: "Теперішнє місце: Активність" });
    expect(here.hasAttribute("disabled")).toBe(true);
    expect(here.textContent).toBe("Тут");
    // Теперішнє місце виділене цілим рядком: акцентна заливка, обвід і
    // знак-галочка, а не лише підпис кнопки.
    expect(here.closest(".wb-group-picker-row--here")?.getAttribute("aria-current")).toBe("true");
    expect(here.className).toContain("wb-btn-primary");
    expect(
      screen.getByRole("button", { name: "Обрати: Режим" }).closest(".wb-group-picker-row--here"),
    ).toBeNull();
    // Корінь лишається доступним: підняти групу на верхній рівень — це рух.
    expect(
      screen.getByRole("button", { name: "Обрати: Верхній рівень" }).hasAttribute("disabled"),
    ).toBe(false);
  });

  it("шлях до теперішнього місця акцентний навіть у згорнутому дереві", () => {
    renderModal({ currentId: 12 });

    // «Ранкова рутина» (12) лежить у «Активності» (11), а та згорнута: самого
    // рядка «Тут» не видно — місце видає акцентний підпис батька.
    expect(screen.queryByRole("button", { name: "Обрати: Ранкова рутина" })).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Обрати: Активність" })
        .closest(".wb-group-picker-row--path"),
    ).toBeTruthy();
    // Сусідня гілка не акцентна: це шлях, а не все, що поруч.
    expect(
      screen.getByRole("button", { name: "Обрати: Режим" }).closest(".wb-group-picker-row--path"),
    ).toBeNull();
  });

  it("гілка, яку переміщують, разом із нащадками в дереві не показується", () => {
    renderModal({ excludeIds: [11, 12] });

    expect(screen.queryByRole("button", { name: "Обрати: Активність" })).toBeNull();
    expect(screen.queryByText("Ранкова рутина")).toBeNull();
    expect(screen.getByRole("button", { name: "Обрати: Режим" })).toBeTruthy();
  });
});
