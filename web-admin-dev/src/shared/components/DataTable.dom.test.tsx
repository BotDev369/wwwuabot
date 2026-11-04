// @vitest-environment jsdom
/**
 * Шаблон таблиці: розмітка, яку вимагає стандарт (закріплені шапка й перший
 * стовпець), порожній стан і вибір рядка з клавіатури.
 * @module web-admin-dev/src/shared/components/DataTable.dom.test
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataTable, type DataTableColumn } from "./DataTable";

interface Row {
  readonly id: string;
  readonly name: string;
}

const COLUMNS: readonly DataTableColumn<Row>[] = [
  { key: "name", header: "Назва", className: "wb-col-key", render: (row) => row.name },
  { key: "id", header: "Код", className: "wb-col-num", render: (row) => row.id },
];

const ROWS: readonly Row[] = [
  { id: "1", name: "Перший" },
  { id: "2", name: "Другий" },
];

describe("DataTable", () => {
  it("малює шапку й рядки всередині скрол-рамки", () => {
    const { container } = render(
      <DataTable columns={COLUMNS} rows={ROWS} rowKey={(row) => row.id} empty="порожньо" />,
    );

    const wrap = container.querySelector(".wb-table-scroll");
    expect(wrap).not.toBeNull();
    expect(wrap?.querySelector("table.wb-table--grid")).not.toBeNull();
    expect(screen.getByRole("columnheader", { name: "Назва" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "Перший" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "2" })).toBeTruthy();
  });

  it("телефонний підпис стає другим рядком першої комірки", () => {
    const { container } = render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={(row) => row.id}
        empty="порожньо"
        mobileMeta={(row) => (
          <>
            <dt>Код</dt>
            <dd>{row.id}</dd>
          </>
        )}
      />,
    );

    // Клас вмикає телефонну розкладку: один видимий стовпець плюс `dl`.
    const table = container.querySelector("table.wb-table--grid");
    expect(table?.classList.contains("wb-table--stack")).toBe(true);

    const firstCells = container.querySelectorAll("tbody td:first-child");
    expect(firstCells).toHaveLength(2);
    expect(firstCells[0]?.querySelector("dl.wb-table-meta dd")?.textContent).toBe("1");
    // Підпис є тільки в першій комірці: інакше телефон показав би його двічі.
    expect(container.querySelectorAll("dl.wb-table-meta")).toHaveLength(2);
  });

  it("без підпису таблиця не вмикає телефонну розкладку", () => {
    const { container } = render(
      <DataTable columns={COLUMNS} rows={ROWS} rowKey={(row) => row.id} empty="порожньо" />,
    );

    expect(
      container.querySelector("table.wb-table--grid")?.classList.contains("wb-table--stack"),
    ).toBe(false);
    expect(container.querySelector("dl.wb-table-meta")).toBeNull();
  });

  it("порожній стан займає всю ширину таблиці й каже причину", () => {
    render(<DataTable columns={COLUMNS} rows={[]} rowKey={(row) => row.id} empty="Даних немає" />);

    const cell = screen.getByText("Даних немає");
    expect(cell.getAttribute("colspan")).toBe("2");
  });

  it("рядок відкривається кліком і з клавіатури", () => {
    const onRowClick = vi.fn();
    render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={(row) => row.id}
        empty="порожньо"
        onRowClick={onRowClick}
      />,
    );

    fireEvent.click(screen.getByRole("cell", { name: "Другий" }));
    expect(onRowClick).toHaveBeenCalledWith(ROWS[1]);

    const row = screen.getByRole("row", { name: /Перший/ });
    fireEvent.keyDown(row, { key: "Enter" });
    expect(onRowClick).toHaveBeenCalledWith(ROWS[0]);

    fireEvent.keyDown(row, { key: " " });
    expect(onRowClick).toHaveBeenCalledTimes(3);

    // Інші клавіші нічого не відкривають: інакше рядок реагував би на будь-що.
    fireEvent.keyDown(row, { key: "a" });
    expect(onRowClick).toHaveBeenCalledTimes(3);
  });

  it("вибраний рядок позначений для екрана й читача", () => {
    render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={(row) => row.id}
        empty="порожньо"
        selectedKey="2"
      />,
    );

    const selected = screen.getByRole("row", { name: /Другий/ });
    expect(selected.className).toContain("wb-table-row--on");
    expect(selected.getAttribute("aria-current")).toBe("true");
    expect(screen.getByRole("row", { name: /Перший/ }).getAttribute("aria-current")).toBeNull();
  });

  it("підпис і клас таблиці доходять до розмітки", () => {
    const { container } = render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={(row) => row.id}
        empty="порожньо"
        caption="Показано 2"
        tableClassName="spend-table--test"
      />,
    );

    expect(screen.getByText("Показано 2").tagName).toBe("CAPTION");
    expect(container.querySelector("table")?.className).toContain("spend-table--test");
  });
});
