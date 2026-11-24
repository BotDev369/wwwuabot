// @vitest-environment jsdom
/**
 * Список сайдбара: три способи дії (адреса, своя дія, заглушка), роль пункту й
 * згортання. Коробка (`SideBar`) — у сусідньому `Sidebar.test.tsx`.
 *
 * @module packages/ui/src/nav/Sidebar.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { SideBarItem, SideBarSection } from "./types";
import { SideBarMenu } from "./Sidebar";

const item = (over: Partial<SideBarItem> & Pick<SideBarItem, "key" | "label">): SideBarItem => ({
  icon: "home",
  ...over,
});

const SECTIONS: SideBarSection[] = [
  {
    key: "everyday",
    items: [
      item({ key: "trackers", label: "Трекери", href: "/trackers" }),
      item({ key: "analysis", label: "Аналіз", href: "/analysis", more: true }),
      item({ key: "self", label: "Себе", onSelect: () => undefined }),
      item({ key: "soon", label: "Скоро" }),
      item({ key: "tabs", label: "Вкладка", role: "tab", id: "tab-1", active: true }),
      item({ key: "radio", label: "Вибір", role: "radio", active: false }),
    ],
  },
];

describe("SideBarMenu", () => {
  it("веде за адресою через оболонку, а не перезавантаженням", () => {
    const navigate = vi.fn();
    render(<SideBarMenu sections={SECTIONS} label="Розділи" navigate={navigate} />);

    fireEvent.click(screen.getByText("Трекери"));

    expect(navigate).toHaveBeenCalledWith("/trackers");
  });

  it("без оболонки пункт лишається звичайним посиланням", () => {
    render(<SideBarMenu sections={SECTIONS} label="Розділи" />);

    fireEvent.click(screen.getByText("Аналіз"));

    expect(screen.getByText("Аналіз").closest("a")?.getAttribute("href")).toBe("/analysis");
  });

  it("своя дія й заглушка роблять те, що сказано, а не мовчать", () => {
    const onSelect = vi.fn();
    const onPlaceholder = vi.fn();
    const sections = SECTIONS.map((section) => ({
      ...section,
      items: section.items.map((one) => (one.key === "self" ? { ...one, onSelect } : one)),
    }));

    render(
      <SideBarMenu
        sections={sections}
        label="Розділи"
        onPlaceholder={onPlaceholder}
        navigate={() => undefined}
      />,
    );

    fireEvent.click(screen.getByText("Себе"));
    fireEvent.click(screen.getByText("Скоро"));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onPlaceholder).toHaveBeenCalledTimes(1);
  });

  it("роль пункту — вміст: вкладка й вибір кажуть про себе самі", () => {
    render(<SideBarMenu sections={SECTIONS} label="Розділи" />);

    expect(screen.getByText("Вкладка").closest("[role=tab]")?.getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(screen.getByText("Вибір").closest("[role=radio]")?.getAttribute("aria-checked")).toBe(
      "false",
    );
  });

  it("згорнутий пункт лишає знак, а ім'я — у `title` й `aria-label`", () => {
    const { container } = render(<SideBarMenu sections={SECTIONS} label="Розділи" collapsed />);

    expect(container.querySelector(".wb-nav-text")).toBeNull();
    expect(screen.getByLabelText("Трекери").getAttribute("title")).toBe("Трекери");
  });
});
