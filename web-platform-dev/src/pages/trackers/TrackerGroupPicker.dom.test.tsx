// @vitest-environment jsdom
/**
 * Вибір групи: дерево типово закрите, «розгорнути всі» поруч «ствворити нову»,
 * вибір — рядок. Нативний `select` цього не вмів: плаский список без
 * структури і без створення.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerGroupPicker.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TrackerGroup } from "@wwwuabot/shared/trackers";

const prompt = vi.fn();
const onPick = vi.fn();
const onCreate = vi.fn();

vi.mock("@wwwuabot/ui/dialog", () => ({
  useDialog: () => ({ prompt, alert: vi.fn(), confirm: vi.fn() }),
}));

const { TrackerGroupPicker } = await import("./TrackerGroupPicker");

const groups: TrackerGroup[] = [
  { id: 10, parentId: null, title: "Режим", key: "routine" },
  { id: 11, parentId: null, title: "Активність", key: "activity" },
  { id: 12, parentId: 11, title: "Ранкова рутина", key: null },
  { id: 13, parentId: 12, title: "Ранок", key: null },
];

function renderPicker(value: number | null = null): void {
  render(
    <TrackerGroupPicker
      label="Група"
      groups={groups}
      value={value}
      onPick={onPick}
      onCreate={onCreate}
    />,
  );
}

async function open(): Promise<void> {
  await userEvent.click(screen.getByRole("button", { name: "Група" }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("вибір групи", () => {
  it("⛔ типово все закрито: підпапки не видно, доки їх не розгорнули", async () => {
    renderPicker();
    await open();

    expect(screen.getByRole("button", { name: "Свої" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Активність" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ранкова рутина" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Розгорнути Активність", expanded: false }),
    ).toBeTruthy();
  });

  it("«розгорнути всі» відкриває дерево цілком, кнопка стає «згорнути всі»", async () => {
    renderPicker();
    await open();

    await userEvent.click(screen.getByRole("button", { name: "Розгорнути всі" }));
    expect(screen.getByRole("button", { name: "Ранкова рутина" })).toBeTruthy();
    // Розгортання рекурсивне: правнук теж видно після одного тапу.
    expect(screen.getByRole("button", { name: "Ранок" })).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Згорнути всі" }));
    expect(screen.queryByRole("button", { name: "Ранкова рутина" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Ранок" })).toBeNull();
  });

  it("вибір рядка несе id на сторінку і закриває модалку", async () => {
    renderPicker();
    await open();

    await userEvent.click(screen.getByRole("button", { name: "Режим" }));

    expect(onPick).toHaveBeenCalledWith(10);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("«Свої» — це вибір без групи, а не рядок дерева", async () => {
    renderPicker(10);
    await open();

    await userEvent.click(screen.getByRole("button", { name: "Свої" }));

    expect(onPick).toHaveBeenCalledWith(null);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("«ствворити нову» питає назву, створює і одразу обирає нову групу", async () => {
    prompt.mockResolvedValueOnce("Дім");
    onCreate.mockResolvedValueOnce({ id: 14, parentId: null, title: "Дім", key: null });
    renderPicker();
    await open();

    await userEvent.click(screen.getByRole("button", { name: "Створити нову" }));

    expect(onCreate).toHaveBeenCalledWith("Дім");
    expect(onPick).toHaveBeenCalledWith(14);
    expect(screen.queryByRole("dialog")).toBeNull();
    // Порожня назва — відміна діалога, а не група без імені: межу дає сам prompt.
    const options = prompt.mock.calls[0][1] as { validate: (value: string) => string | null };
    expect(options.validate("   ")).toBe("Порожньо");
    expect(options.validate("Дім")).toBeNull();
  });

  it("скасований prompt нічого не створює", async () => {
    prompt.mockResolvedValueOnce(null);
    renderPicker();
    await open();

    await userEvent.click(screen.getByRole("button", { name: "Створити нову" }));

    expect(onCreate).not.toHaveBeenCalled();
    expect(onPick).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
