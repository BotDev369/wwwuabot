// @vitest-environment jsdom
/**
 * Крок систем: чотири традиції, усі вибрані — вибір звужує погляд, а не
 * слугує перепусткою.
 *
 * Ламається мовчки: знятий вибір мусить зникати з адреси; порожній вибір не
 * пускає далі; без дати крок не рахує нічого.
 *
 * @module web-platform-dev/src/pages/analysis/SystemsStep.dom.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { LENSES } from "@wwwuabot/shared/qualities";
import { SystemsStep } from "./SystemsStep";

vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));

function Probe(): React.ReactElement {
  const location = useLocation();
  return <p>{`${location.pathname}${location.search}`}</p>;
}

function renderStep(search: string): void {
  window.history.replaceState({}, "", `/analysis/person/systems${search}`);
  render(
    <MemoryRouter initialEntries={[`/analysis/person/systems${search}`]}>
      <Routes>
        <Route path="/analysis/person/systems" element={<SystemsStep mode="person" />} />
        <Route path="/analysis/person/result" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("крок систем", () => {
  it("усі системи вже вибрані й підписані іменами", () => {
    renderStep("?dates=1980-03-03&labels=Іван");

    expect(screen.getByRole("heading", { name: "Хто читає дату?" })).toBeTruthy();
    expect(screen.getByText("Іван")).toBeTruthy();
    expect(screen.getByText("Чотири традиції незалежно одна від одної.")).toBeTruthy();
    for (const lens of LENSES) {
      const box = screen.getByRole("checkbox", { name: new RegExp(lens.name) });
      expect((box as HTMLInputElement).checked).toBe(true);
    }
  });

  it("знята система не їде в адресу результату", async () => {
    renderStep("?dates=1980-03-03&labels=Іван");
    const first = LENSES[0];

    await userEvent.click(screen.getByRole("checkbox", { name: new RegExp(first.name) }));
    await userEvent.click(screen.getByRole("button", { name: "Порахувати профіль" }));

    const probe = screen.getByText(/^\/analysis\/person\/result\?/);
    expect(probe.textContent).toContain("dates=1980-03-03");
    expect(probe.textContent).not.toContain(first.id);
    expect(probe.textContent).toContain(LENSES[1].id);
  });

  it("без вибраних систем кнопка мовчить", async () => {
    renderStep("?dates=1980-03-03");
    const submit = screen.getByRole("button", { name: "Порахувати профіль" }) as HTMLButtonElement;

    for (const lens of LENSES) {
      await userEvent.click(screen.getByRole("checkbox", { name: new RegExp(lens.name) }));
    }

    expect(submit.disabled).toBe(true);
  });

  it("кілька дат каже, що кожна система читає кожну", () => {
    renderStep("?dates=1980-03-03,1991-12-31");
    expect(screen.getByText("2 дати — кожна система читає кожну.")).toBeTruthy();
  });
});
