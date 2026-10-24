// @vitest-environment jsdom
/**
 * Дія — натискання, яке не стало ні переходом, ні модалкою: перехід пише
 * сторінка, поверхню — модалка, тож дотик чекає й скасовується, якщо щось
 * відкрилось. Інакше в журналі було б два рядки з тією самою назвою.
 *
 * @module web-platform-dev/src/layout/useActionLog.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/shared/api/client", () => ({ apiFetch: mocks.request, apiUpload: vi.fn() }));

const { useActionLog } = await import("./useActionLog");
const { cancelHeldClick } = await import("./platform-journal");

function Harness(): React.ReactElement {
  useActionLog();
  return (
    <>
      <button aria-label="Додати трекер">+</button>
      <div className="card">Кава вдома</div>
      <a href="/notes">Нотатки</a>
      <input aria-label="Назва" />
      <input type="password" aria-label="Пароль" />
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
  it("кнопка — її підпис і сторінка, у якій вона стоїть", async () => {
    renderAt();

    fireEvent.click(screen.getByRole("button", { name: "Додати трекер" }));

    await waitFor(() =>
      expect(reported()).toEqual([{ kind: "click", screen: "trackers", label: "Додати трекер" }]),
    );
    // Запит мусить пережити навігацію: без `keepalive` дотик «Назад» губився.
    expect(mocks.request.mock.calls[0]?.[1]).toMatchObject({ keepalive: true });
  });

  it("картка без адреси теж рахується", async () => {
    renderAt("/notes");

    fireEvent.click(screen.getByText("Кава вдома"));

    await waitFor(() =>
      expect(reported()).toEqual([{ kind: "click", screen: "notes", label: "Кава вдома" }]),
    );
  });

  it("вибір у полі — окремий вид події", () => {
    renderAt();

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "мл" } });

    expect(reported()).toEqual([
      { kind: "input", screen: "trackers", label: "мл", field: "Одиниця" },
    ]);
  });

  it("уведений текст стає рядком після паузи, із назвою поля", async () => {
    renderAt("/notes");
    const field = screen.getByLabelText("Назва");

    fireEvent.input(field, { target: { value: "купити хліб" } });

    await waitFor(
      () =>
        expect(reported()).toEqual([
          { kind: "input", screen: "notes", label: "купити хліб", field: "Назва" },
        ]),
      { timeout: 2000 },
    );
  });

  it("секрет у журнал не потрапляє", async () => {
    renderAt("/notes");

    fireEvent.input(screen.getByLabelText("Пароль"), { target: { value: "hunter2" } });
    fireEvent.focusOut(screen.getByLabelText("Пароль"));

    expect(mocks.request).not.toHaveBeenCalled();
  });
});

describe("чого не дублюємо", () => {
  it("перехід за посиланням — це «відкрив сторінку», а не дія", async () => {
    renderAt();

    fireEvent.click(screen.getByRole("link", { name: "Нотатки" }));
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("дотик скасовується, коли відкрилась поверхня", async () => {
    renderAt();

    fireEvent.click(screen.getByRole("button", { name: "Додати трекер" }));
    cancelHeldClick();
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(mocks.request).not.toHaveBeenCalled();
  });
});
