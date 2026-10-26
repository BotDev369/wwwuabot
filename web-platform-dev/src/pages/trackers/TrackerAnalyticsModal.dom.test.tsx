// @vitest-environment jsdom
/**
 * Аналітика трекера — окрема поверхня: звіт рахується з тих самих рядків, що й
 * графік, а історія поруч лише читається. Вікно звіту справді міняється
 * вкладками, кілька дотиків одного дня лишаються окремими рядками, а
 * прибирання виміру питає — без питання дотик зникав би одним рухом.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerAnalyticsModal.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
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

beforeEach(() => {
  vi.clearAllMocks();
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

describe("звіт", () => {
  it("середнє, серія й дні з записом рахуються з історії", () => {
    const { container } = render(<TrackerAnalyticsModal tracker={water} onClose={hooks.close} />);
    const stats = container.querySelector(".wb-tracker-stats") as HTMLElement;

    expect(within(stats).getByText("1,5 л")).toBeTruthy();
    expect(within(stats).getByText("3 з 30")).toBeTruthy();
    expect(within(stats).getByText("3 дн.")).toBeTruthy();
  });

  it("вікно звіту справді звужується", async () => {
    render(<TrackerAnalyticsModal tracker={water} onClose={hooks.close} />);

    await userEvent.click(screen.getByRole("tab", { name: "7 дн." }));

    expect(screen.getByText("3 з 7")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "7 дн." }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "30 дн." }).getAttribute("aria-selected")).toBe("false");
  });

  it("ціль виконано — число днів, а не середнє", () => {
    render(<TrackerAnalyticsModal tracker={water} onClose={hooks.close} />);

    expect(screen.getByText("1 з 30 · 3%")).toBeTruthy();
  });
});

describe("історія", () => {
  it("порожній трекер каже, з чого почати", () => {
    state.entries = [];
    render(<TrackerAnalyticsModal tracker={water} onClose={hooks.close} />);

    expect(screen.getByText(/Записів ще немає/)).toBeTruthy();
  });

  it("⛔ завантаження без дня не падає: вікно ще не будується", () => {
    state.tracker = null;
    state.endDay = "";
    state.loading = true;

    render(<TrackerAnalyticsModal tracker={water} onClose={hooks.close} />);

    expect(screen.getByText("Завантаження…")).toBeTruthy();
  });

  it("⛔ два дотики одного дня — два рядки в історії, а не один", () => {
    state.entries = [
      ...state.entries,
      { id: 4, day: "2026-10-17", value: 0.5, note: "ще склянка", loggedAt: "2026-10-17 13:45:00" },
    ];
    const { container } = render(<TrackerAnalyticsModal tracker={water} onClose={hooks.close} />);

    expect(container.querySelectorAll(".wb-tracker-history-row")).toHaveLength(4);
  });

  it("⛔ рядок історії — не кнопка: минулий вимір не редагується, лише прибирається", () => {
    const { container } = render(<TrackerAnalyticsModal tracker={water} onClose={hooks.close} />);
    const first = container.querySelector(".wb-tracker-history-row") as HTMLElement;

    // День і число — текст, а не кнопка: єдиний дотик у рядку — прибирання.
    expect(within(first).getByText("17.10").closest("button")).toBeNull();
    expect(within(first).getAllByRole("button")).toHaveLength(1);
    expect(within(first).getByRole("button", { name: /Прибрати запис/ })).toBeTruthy();
  });

  it("історія показує час дотика", () => {
    render(<TrackerAnalyticsModal tracker={water} onClose={hooks.close} />);

    expect(screen.getByText("09:00")).toBeTruthy();
    expect(screen.getByText("21:10")).toBeTruthy();
  });

  it("прибирання дотика питає підтвердження", async () => {
    render(<TrackerAnalyticsModal tracker={water} onClose={hooks.close} />);

    await userEvent.click(screen.getByRole("button", { name: "Прибрати запис 17.10 09:00" }));

    expect(hooks.confirm).toHaveBeenCalled();
    expect(hooks.remove).not.toHaveBeenCalled();

    hooks.confirm.mockResolvedValueOnce(true);
    await userEvent.click(screen.getByRole("button", { name: "Прибрати запис 17.10 09:00" }));
    expect(hooks.remove).toHaveBeenCalledWith(1);
  });
});

describe("збій", () => {
  it("причина й повторення стоять на місці звіту", async () => {
    state.error = "Трекера не знайдено.";
    render(<TrackerAnalyticsModal tracker={water} onClose={hooks.close} />);

    expect(screen.getByText("Трекера не знайдено.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Повторити" }));
    expect(hooks.reload).toHaveBeenCalled();
  });
});
