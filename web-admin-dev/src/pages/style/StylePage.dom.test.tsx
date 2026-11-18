// @vitest-environment jsdom
/**
 * «Єдиний UI»: перелік, лічильники, зразки й згорнуті розділи.
 *
 * @module web-admin-dev/src/pages/style/StylePage.dom.test
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StylePage } from "./StylePage";
import inventory from "./ui-inventory.json";

const elements = inventory.groups.flatMap((group) => group.elements);

function renderExpanded() {
  render(<StylePage />);
  fireEvent.click(screen.getByRole("button", { name: inventory.page.expandAll }));
}

describe("сторінка «Єдиний UI»", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("показує назву, вступ і всі розділи переліку", () => {
    render(<StylePage />);

    expect(screen.getByRole("heading", { name: inventory.page.title })).toBeTruthy();
    for (const group of inventory.groups) {
      expect(screen.getByText(group.label)).toBeTruthy();
    }
  });

  it("тримає розділи згорнутими, доки їх не розгорнуто", () => {
    render(<StylePage />);

    expect(document.querySelectorAll(".ui-row")).toHaveLength(0);

    const [first] = inventory.groups;
    fireEvent.click(screen.getByText(first.label).closest("button")!);

    expect(document.querySelectorAll(".ui-row")).toHaveLength(first.elements.length);
    expect(screen.getByRole("button", { name: inventory.page.expandAll })).toBeTruthy();
  });

  it("показує кожен елемент переліку з його класом і зразком", () => {
    renderExpanded();

    expect(document.querySelectorAll(".ui-row")).toHaveLength(elements.length);
    expect(document.querySelectorAll(".ui-sample")).toHaveLength(elements.length);

    /* Підписи збираємо з DOM, а не шукаємо кожен окремо: сотні запитів по
       живій сторінці не вкладаються в ліміт тесту. */
    const labels = [...document.querySelectorAll(".ui-class")].map((node) => node.textContent);
    expect(labels).toHaveLength(elements.length);
    for (const element of elements) {
      const label = element.sample === "icon" ? element.className : `.${element.className}`;
      expect(labels).toContain(label);
    }
  });

  it("перелічує всі блоки Page Builder із реєстру", () => {
    renderExpanded();

    const blocks = inventory.groups.find((group) => group.id === "blocks");
    expect(blocks).toBeTruthy();
    for (const block of blocks!.elements) {
      expect(block.verdict).toBe("builder");
    }
    /* Блоків у реєстрі `block-definitions` більше, ніж банер і акордеон. */
    expect(blocks!.elements.length).toBeGreaterThan(20);
    expect(blocks!.elements.some((block) => block.className === 'type: "pricing"')).toBe(true);
  });

  it("лічить ужиток класів тим самим числом, що перелік", () => {
    renderExpanded();

    const button = elements.find((element) => element.id === "btn");
    expect(button).toBeTruthy();
    const row = screen.getByText(".wb-btn").closest(".ui-row");
    expect(row?.textContent).toContain(`${inventory.page.platform} ${button!.usage.platform}`);
    expect(row?.textContent).toContain(`${inventory.page.admin} ${button!.usage.admin}`);
  });

  it("ставить присуд кожному елементу", () => {
    renderExpanded();

    const verdicts = inventory.verdicts as Record<string, { label: string }>;
    for (const label of Object.values(verdicts).map((verdict) => verdict.label)) {
      const count = elements.filter((element) => verdicts[element.verdict].label === label).length;
      const inRows = [...document.querySelectorAll(".ui-row .wb-badge")].filter(
        (badge) => badge.textContent === label,
      );
      expect(inRows.length).toBe(count);
    }
  });
});
