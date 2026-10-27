// @vitest-environment jsdom
/**
 * Аналітика трекера — серія акордеонів: періоди зверху вниз, історія під
 * власним акордеоном. Типово все закрито, вибір пам'ятається в `localStorage`,
 * а «Розгорнути все» відкриває кожну панель однією дією.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerAnalyticsModal.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Tracker, TrackerEntry } from "@wwwuabot/shared/trackers";

const hooks = {
  close: vi.fn(),
  alert: vi.fn(),
  confirm: vi.fn(async () => false),
  remove: vi.fn(async () => true),
  reload: vi.fn(),
};

const water: Tracker = {
  id: 1,
  key: "water",
  title: "Вода",
  unit: "л",
  step: 0.25,
  goal: 2,
  min: 0,
  max: 20,
  icon: "droplet",
  groupId: null,
  isBuiltin: true,
  mode: "sum",
  valueType: "number",
};

const temperature: Tracker = {
  ...water,
  id: 2,
  key: "temperature",
  title: "Температура",
  unit: "°C",
  step: 0.1,
  goal: null,
  mode: "read",
};

const state = {
  tracker: water as Tracker | null,
  entries: [] as TrackerEntry[],
  endDay: "2026-10-17",
  loading: false,
  error: null as string | null,
  reload: hooks.reload,
  remove: hooks.remove,
};

vi.mock("@wwwuabot/ui/dialog", () => ({
  useDialog: () => ({ alert: hooks.alert, confirm: hooks.confirm }),
}));
vi.mock("./useTracker", () => ({ useTracker: () => state }));

const { TrackerAnalyticsModal } = await import("./TrackerAnalyticsModal");

const STORAGE_KEY = "wb-tracker-analytics-open";

function renderModal(tracker: Tracker = water) {
  return render(<TrackerAnalyticsModal tracker={tracker} onClose={hooks.close} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  state.tracker = water;
  state.endDay = "2026-10-17";
  state.loading = false;
  state.error = null;
  state.entries = [
    { id: 1, day: "2026-10-17", value: 2, note: "", loggedAt: "2026-10-17 09:00:00" },
    { id: 2, day: "2026-10-16", value: 1.5, note: "після бігу", loggedAt: "2026-10-16 21:10:00" },
    { id: 3, day: "2026-10-15", value: 1, note: "", loggedAt: "2026-10-15 08:00:00" },
  ];
});

describe("акордеони періодів", () => {
  it("блок «середнє, усього, серія» зник — лишились графіки", () => {
    const { container } = renderModal();

    expect(container.querySelector(".wb-tracker-stats")).toBeNull();
    expect(screen.queryByText("Середнє за день")).toBeNull();
    expect(screen.queryByText("Серія")).toBeNull();
  });

  it("усі панелі закриті типово — жодного графіка на екрані", () => {
    const { container } = renderModal();

    const titles = container.querySelectorAll(".wb-tp-panel-title");
    expect(Array.from(titles).map((node) => node.textContent)).toEqual([
      "Всього",
      "Помісячно",
      "Поточний місяць",
      "Тиждень",
      "День",
      "Година",
      "15 хв",
      "Довільний проміжок",
      "Історія",
    ]);
    expect(container.querySelectorAll(".wb-tp-plot")).toHaveLength(0);
  });

  it("«Всього» показує колонки років, підписи — у шапці зверху", async () => {
    const { container } = renderModal();

    await userEvent.click(screen.getByRole("button", { name: "Всього" }));

    const head = within(container.querySelector(".wb-tp-head") as HTMLElement);
    expect(head.getByText("2026")).toBeTruthy();
    expect(container.querySelectorAll(".wb-tp-bar")).toHaveLength(1);
    // Порожні колонки — сірі крапки, а не нулі.
    expect(container.querySelectorAll(".wb-tp-void")).toHaveLength(0);
  });

  it("«Помісячно» — 12 колонок року, порожні місяці — сірі крапки", async () => {
    const { container } = renderModal();

    await userEvent.click(screen.getByRole("button", { name: "Помісячно" }));

    expect(container.querySelectorAll(".wb-tp-slot")).toHaveLength(12);
    expect(container.querySelectorAll(".wb-tp-void")).toHaveLength(11);
  });

  it("виміри стоять точками, а не стовпчиками від нуля", async () => {
    state.tracker = temperature;
    const { container } = renderModal(temperature);

    await userEvent.click(screen.getByRole("button", { name: "Всього" }));

    expect(container.querySelectorAll(".wb-tp-dot")).toHaveLength(1);
    expect(container.querySelectorAll(".wb-tp-bar")).toHaveLength(0);
  });

  it("«Розгорнути все» відкриває кожну панель і стає «Згорнути все»", async () => {
    const { container } = renderModal();

    await userEvent.click(screen.getByRole("button", { name: "Розгорнути все" }));

    // Графік є там, де є записи: «Година» і «15 хв» для цих даних порожні.
    expect(container.querySelectorAll(".wb-tp-plot")).toHaveLength(6);
    expect(screen.getAllByText("Немає записів за цей період")).toHaveLength(2);
    expect(container.querySelectorAll(".wb-tracker-history-row")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Згорнути все" })).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Згорнути все" }));
    expect(container.querySelectorAll(".wb-tp-plot")).toHaveLength(0);
  });

  it("повторний дотик закриває панель", async () => {
    const { container } = renderModal();

    await userEvent.click(screen.getByRole("button", { name: "День" }));
    expect(container.querySelectorAll(".wb-tp-plot")).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: "День" }));
    expect(container.querySelectorAll(".wb-tp-plot")).toHaveLength(0);
  });

  it("стан акордеонів пам'ятається в localStorage", async () => {
    const first = renderModal();
    await userEvent.click(screen.getByRole("button", { name: "Тиждень" }));

    expect(localStorage.getItem(STORAGE_KEY)).toContain("week");
    expect(first.container.querySelectorAll(".wb-tp-plot")).toHaveLength(1);

    first.unmount();
    const again = renderModal();
    expect(again.container.querySelectorAll(".wb-tp-plot")).toHaveLength(1);
  });

  it("довільний проміжок типово — 30 днів і поля дат", async () => {
    const { container } = renderModal();

    await userEvent.click(screen.getByRole("button", { name: "Довільний проміжок" }));

    expect(container.querySelectorAll(".wb-tp-slot")).toHaveLength(30);
    expect(screen.getByLabelText("Від")).toBeTruthy();
    expect(screen.getByLabelText("До")).toBeTruthy();

    // Обрана дата перебудовує проміжок: 10.10–17.10 — вісім колонок.
    fireEvent.change(screen.getByLabelText("Від"), { target: { value: "2026-10-10" } });
    expect(container.querySelectorAll(".wb-tp-slot")).toHaveLength(8);
  });
});

describe("історія", () => {
  it("порожній трекер каже, з чого почати", async () => {
    state.entries = [];
    renderModal();

    await userEvent.click(screen.getByRole("button", { name: "Історія" }));

    expect(screen.getByText(/Записів ще немає/)).toBeTruthy();
  });

  it("⛔ завантаження без дня не падає: вікно ще не будується", () => {
    state.tracker = null;
    state.endDay = "";
    state.loading = true;

    renderModal();

    expect(screen.getByText("Завантаження…")).toBeTruthy();
  });

  it("⛔ два дотики одного дня — два рядки в історії, а не один", async () => {
    state.entries = [
      ...state.entries,
      { id: 4, day: "2026-10-17", value: 0.5, note: "ще склянка", loggedAt: "2026-10-17 13:45:00" },
    ];
    const { container } = renderModal();

    await userEvent.click(screen.getByRole("button", { name: "Історія" }));

    expect(container.querySelectorAll(".wb-tracker-history-row")).toHaveLength(4);
  });

  it("⛔ рядок історії — не кнопка: минулий вимір не редагується, лише прибирається", async () => {
    const { container } = renderModal();

    await userEvent.click(screen.getByRole("button", { name: "Історія" }));
    const first = container.querySelector(".wb-tracker-history-row") as HTMLElement;

    // День і число — текст, а не кнопка: єдиний дотик у рядку — прибирання.
    expect(within(first).getByText("17.10").closest("button")).toBeNull();
    expect(within(first).getAllByRole("button")).toHaveLength(1);
    expect(within(first).getByRole("button", { name: /Прибрати запис/ })).toBeTruthy();
  });

  it("історія показує час дотика", async () => {
    renderModal();

    await userEvent.click(screen.getByRole("button", { name: "Історія" }));

    expect(screen.getByText("09:00")).toBeTruthy();
    expect(screen.getByText("21:10")).toBeTruthy();
  });

  it("прибирання дотика питає підтвердження", async () => {
    renderModal();

    await userEvent.click(screen.getByRole("button", { name: "Історія" }));
    await userEvent.click(screen.getByRole("button", { name: "Прибрати запис 17.10 09:00" }));

    expect(hooks.confirm).toHaveBeenCalled();
    expect(hooks.remove).not.toHaveBeenCalled();

    hooks.confirm.mockResolvedValueOnce(true);
    await userEvent.click(screen.getByRole("button", { name: "Прибрати запис 17.10 09:00" }));
    expect(hooks.remove).toHaveBeenCalledWith(1);
  });
});

describe("збій", () => {
  it("причина й повторення стоять на місці графіків", async () => {
    state.error = "Трекера не знайдено.";
    renderModal();

    expect(screen.getByText("Трекера не знайдено.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Повторити" }));
    expect(hooks.reload).toHaveBeenCalled();
  });
});
