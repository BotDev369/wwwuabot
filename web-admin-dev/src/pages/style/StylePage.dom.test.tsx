// @vitest-environment jsdom
/**
 * «Єдиний UI»: перелік, лічильники й зразки кожного кирпичика.
 *
 * @module web-admin-dev/src/pages/style/StylePage.dom.test
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { StylePage } from "./StylePage";
import inventory from "./ui-inventory.json";

const elements = inventory.groups.flatMap((group) => group.elements);

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
      expect(screen.getByRole("heading", { name: group.label })).toBeTruthy();
    }
  });

  it("показує кожен елемент переліку з його класом і зразком", () => {
    render(<StylePage />);

    expect(document.querySelectorAll(".ui-row")).toHaveLength(elements.length);
    expect(document.querySelectorAll(".ui-sample")).toHaveLength(elements.length);
    for (const element of elements) {
      expect(screen.getByText(`.${element.className}`)).toBeTruthy();
    }
  });

  it("лічить ужиток класів тим самим числом, що перелік", () => {
    render(<StylePage />);

    const button = elements.find((element) => element.id === "btn");
    expect(button).toBeTruthy();
    const row = screen.getByText(".wb-btn").closest(".ui-row");
    expect(row?.textContent).toContain(`${inventory.page.platform} ${button!.usage.platform}`);
    expect(row?.textContent).toContain(`${inventory.page.admin} ${button!.usage.admin}`);
  });

  it("ставить присуд кожному елементу", () => {
    render(<StylePage />);

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
