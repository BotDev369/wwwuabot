// @vitest-environment jsdom
/**
 * Кожен дотик у застосунку стає рядком журналу: кнопка, картка, поле —
 * з підписом і екраном, у якому це сталося.
 *
 * @module web-platform-dev/src/layout/useActionLog.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/shared/api/client", () => ({ apiFetch: mocks.request, apiUpload: vi.fn() }));

const { useActionLog } = await import("./useActionLog");

function Harness(): React.ReactElement {
  useActionLog();
  return (
    <>
      <button aria-label="Додати трекер">+</button>
      <div className="card">Кава вдома</div>
      <select aria-label="Одиниця">
        <option>л</option>
        <option>мл</option>
      </select>
      <p>просто текст</p>
    </>
  );
}

function renderAt(path = "/trackers"): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Harness />
    </MemoryRouter>,
  );
}

/** Тіло звіту — те, що побачить журнал. */
function reported(): unknown[] {
  return mocks.request.mock.calls.map(([, init]) =>
    JSON.parse((init as RequestInit).body as string),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.request.mockResolvedValue({ ok: true });
});

describe("що стає рядком", () => {
  it("дотик по кнопці — її підпис і екран", () => {
    renderAt();

    fireEvent.click(screen.getByRole("button", { name: "Додати трекер" }));

    expect(reported()).toEqual([
      { kind: "click", screen: "trackers", label: "Додати трекер", target: "кнопка" },
    ]);
    // Запит мусить пережити навігацію: без `keepalive` дотик «Назад» губився.
    expect(mocks.request.mock.calls[0]?.[1]).toMatchObject({ keepalive: true });
  });

  it("дотик по картці теж рахується", () => {
    renderAt("/notes");

    fireEvent.click(screen.getByText("Кава вдома"));

    expect(reported()).toEqual([
      { kind: "click", screen: "notes", label: "Кава вдома", target: "div" },
    ]);
  });

  it("вибір у полі — окремий вид події", () => {
    renderAt();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "мл" } });

    expect(reported()).toEqual([
      { kind: "input", screen: "trackers", label: "Одиниця: мл", target: "поле" },
    ]);
  });

  it("дотик по тексту теж рахується — це теж місце, куди людина ткнула", () => {
    renderAt();

    fireEvent.click(screen.getByText("просто текст"));

    expect(reported()).toEqual([
      { kind: "click", screen: "trackers", label: "просто текст", target: "p" },
    ]);
  });
});

describe("навігація", () => {
  it("звіт не ламає екран, коли мережа відмовила", () => {
    mocks.request.mockRejectedValue(new Error("HTTP 500"));
    renderAt();

    fireEvent.click(screen.getByRole("button", { name: "Додати трекер" }));

    expect(screen.getByRole("button", { name: "Додати трекер" })).toBeTruthy();
  });
});
