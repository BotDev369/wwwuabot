// @vitest-environment jsdom
/**
 * Вкладки картки сценарію: активний стан і те, що «JSON» — не вкладка, а дія.
 *
 * @module web-admin-dev/src/pages/scenarios/ScenarioCardTabs.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MainTabs, SubTabs } from "./ScenarioCardTabs";
import { MAIN_TABS, SUB_TABS } from "./scenario-modal-types";

describe("MainTabs", () => {
  it("малює всі головні вкладки й позначає активну", () => {
    render(<MainTabs active="web" onSelect={vi.fn()} />);

    for (const tab of MAIN_TABS) {
      expect(screen.getByTitle(tab.label)).toBeTruthy();
    }
    expect(screen.getByTitle("Сторінка").className).toContain("wb-line-tab--active");
    expect(screen.getByTitle("Спільне").className).not.toContain("wb-line-tab--active");
  });

  it("клік віддає ключ вкладки, а не підпис", () => {
    const onSelect = vi.fn();
    render(<MainTabs active="web" onSelect={onSelect} />);

    fireEvent.click(screen.getByTitle("Спільне"));
    expect(onSelect).toHaveBeenCalledWith("shared");
  });
});

describe("SubTabs", () => {
  it("малює підвкладки й позначає активну", () => {
    render(<SubTabs active="preview" onSelect={vi.fn()} onOpenJson={vi.fn()} />);

    for (const tab of SUB_TABS) {
      expect(screen.getByTitle(tab.label)).toBeTruthy();
    }
    expect(screen.getByTitle("Превʼю").className).toContain("wb-line-tab--active");
  });

  it("«JSON» відкриває редактор, а не перемикає вкладку", () => {
    const onSelect = vi.fn();
    const onOpenJson = vi.fn();
    render(<SubTabs active="preview" onSelect={onSelect} onOpenJson={onOpenJson} />);

    fireEvent.click(screen.getByTitle("JSON"));
    expect(onOpenJson).toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("конструктор перемикає підвкладку", () => {
    const onSelect = vi.fn();
    render(<SubTabs active="preview" onSelect={onSelect} onOpenJson={vi.fn()} />);

    fireEvent.click(screen.getByTitle("Конструктор"));
    expect(onSelect).toHaveBeenCalledWith("constructor");
  });
});
