// @vitest-environment jsdom
/**
 * Рейтинг: довжина смуги рахується від найбільшого, а не від суми, і порожній
 * ряд не малює вісь.
 * @module web-admin-dev/src/pages/spending/SpendingRankChart.dom.test
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SpendingRankChart } from "./SpendingRankChart";

const ROWS = [
  { key: "2111", label: "2111", amount: 500 },
  { key: "2210", label: "2210", amount: 250 },
];

describe("SpendingRankChart", () => {
  it("найбільша смуга займає всю ширину, решта — пропорційно", () => {
    const { container } = render(<SpendingRankChart rows={ROWS} total={1000} />);

    const widths = [...container.querySelectorAll(".spend-rank-fill")].map((node) =>
      node.getAttribute("width"),
    );
    expect(widths).toEqual(["100", "50"]);
  });

  it("підпис і частка стоять поруч зі смугою", () => {
    render(<SpendingRankChart rows={ROWS} total={1000} label="КЕКВ" />);

    expect(screen.getByText("КЕКВ")).toBeTruthy();
    expect(screen.getByText("50%")).toBeTruthy();
    expect(screen.getByText(/500/)).toBeTruthy();
  });

  it("порожній або нульовий ряд нічого не малює", () => {
    const empty = render(<SpendingRankChart rows={[]} total={0} />);
    expect(empty.container.querySelector(".spend-rank")).toBeNull();
    empty.unmount();

    const zero = render(
      <SpendingRankChart rows={[{ key: "x", label: "x", amount: 0 }]} total={0} />,
    );
    expect(zero.container.querySelector(".spend-rank")).toBeNull();
  });
});
