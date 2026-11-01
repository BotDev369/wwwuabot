// @vitest-environment jsdom
/**
 * Панель умов показу блоку: пігулки, зняття й очищення.
 *
 * Найважливіша поведінка — не «намалювати», а віддати назовні `undefined`, коли
 * умов не лишилось: інакше блок назавжди ховається від усіх.
 *
 * @module web-admin-dev/src/features/page-builder/ConditionsPanel.dom.test
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ConditionsPanel } from "./ConditionsPanel";

const update = vi.fn();

function setup(conditions?: Record<string, unknown>) {
  update.mockClear();
  const view = render(<ConditionsPanel conditions={conditions as never} onUpdate={update} />);
  return view;
}

describe("ConditionsPanel", () => {
  it("без умов нічого не вибрано й немає власних стилів", () => {
    const { container } = setup();

    const pressed = [...container.querySelectorAll(".pb-cond__toggle")].filter(
      (el) => el.getAttribute("aria-pressed") === "true",
    );
    expect(pressed).toHaveLength(0);
    expect(container.querySelectorAll('[class*="pb-"][style]')).toHaveLength(0);
    expect(screen.getByText("Умови показу блоку")).toBeTruthy();
  });

  it("клік по ролі додає її до умов", () => {
    setup();

    fireEvent.click(screen.getByText("admin"));
    expect(update).toHaveBeenCalledWith({ role: ["admin"] });
  });

  it("повторний клік знімає роль і віддає порожні умови", () => {
    setup({ role: ["admin"] });

    fireEvent.click(screen.getByText("admin"));
    expect(update).toHaveBeenCalledWith(undefined);
  });

  it("кілька полів збираються в один об'єкт", () => {
    setup({ role: ["admin"] });

    fireEvent.click(screen.getByText("pro"));
    expect(update).toHaveBeenCalledWith({ role: ["admin"], tariff: ["pro"] });
  });

  it("знижка 0 прибирає поле, а додатна — лишає", () => {
    const { container } = setup({ role: ["user"] });
    const input = container.querySelector(".pb-cond__number") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "15" } });
    expect(update).toHaveBeenCalledWith({ role: ["user"], minDiscount: 15 });

    fireEvent.change(input, { target: { value: "0" } });
    expect(update).toHaveBeenCalledWith({ role: ["user"] });
  });

  it("вибрані значення позначені як натиснуті", () => {
    const { container } = setup({ role: ["vip"], status: ["active"] });

    const active = [...container.querySelectorAll(".pb-cond__toggle--active")].map(
      (el) => el.textContent,
    );
    expect(active).toEqual(["vip", "active"]);
  });
});
