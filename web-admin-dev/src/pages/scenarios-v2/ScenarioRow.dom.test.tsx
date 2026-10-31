// @vitest-environment jsdom
/**
 * Рядок таблиці сценаріїв: назва, тип, відкриття й те, що клік по кнопці
 * не вибирає рядок заодно.
 *
 * @module web-admin-dev/src/pages/scenarios-v2/ScenarioRow.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ScenarioRow } from "./ScenarioRow";

const PHOTO = {
  slug: "viruvannia",
  rich_message: "false",
  page_data: null,
  updated_at: "2026-09-01 10:00:00",
  title: "Вірування",
};

const PAGE = {
  slug: "nastya",
  rich_message: null,
  page_data: '{"version":1}',
  updated_at: "2026-09-02 10:00:00",
  title: null,
};

function row(scenario: typeof PHOTO | typeof PAGE, overrides: Record<string, unknown> = {}) {
  const props = { scenario, isSelected: false, onSelect: vi.fn(), onOpen: vi.fn(), ...overrides };
  render(
    <table>
      <tbody>
        <ScenarioRow {...(props as Parameters<typeof ScenarioRow>[0])} />
      </tbody>
    </table>,
  );
  return props;
}

describe("ScenarioRow", () => {
  it("показує адресу й людську назву, коли вона є", () => {
    row(PHOTO);

    expect(screen.getByText("viruvannia")).toBeTruthy();
    expect(screen.getByText("Вірування")).toBeTruthy();
  });

  it("без назви не дублює адресу другим рядком", () => {
    row(PAGE);

    expect(screen.getByText("nastya")).toBeTruthy();
    expect(screen.queryByText("nastya")).toBe(screen.getAllByText("nastya")[0]);
  });

  it("позначає вибраний рядок класом", () => {
    row(PHOTO, { isSelected: true });
    const tr = screen.getByText("viruvannia").closest("tr") as HTMLElement;

    expect(tr.className).toBe("selected");
  });

  it("клік по рядку вибирає, кнопка відкриває й не вибирає", () => {
    const props = row(PHOTO);
    const tr = screen.getByText("viruvannia").closest("tr") as HTMLElement;

    fireEvent.click(tr);
    expect(props.onSelect).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Відкрити/ }));
    expect(props.onOpen).toHaveBeenCalledTimes(1);
    expect(props.onSelect).toHaveBeenCalledTimes(1);
  });

  it("тип видно значком, а не лише кольором", () => {
    row(PAGE);

    expect(screen.getByText(/Page|Сторінка|Сторінка/)).toBeTruthy();
  });
});
