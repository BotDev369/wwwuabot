// @vitest-environment jsdom
/**
 * Один трекер: звіт рахується з тих самих рядків, що й графік.
 *
 * Перевіряємо те, що не видно очима в коді: вікно звіту справді міняється
 * (вкладки, а не два місця правди), кілька дотиків одного дня **сумаються**,
 * поле запису приходить порожнім, а «Прибрати» йде
 * через діалог — без нього дотик зникав би одним дотиком.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerPage.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Tracker, TrackerEntry, TrackerGroup } from "@wwwuabot/shared/trackers";

const hooks = {
  navigate: vi.fn(),
  alert: vi.fn(),
  confirm: vi.fn(async () => false),
  save: vi.fn(async () => true),
  remove: vi.fn(async () => true),
  archive: vi.fn(async () => true),
  move: vi.fn(async () => true),
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
  groups: [] as TrackerGroup[],
  entries: [] as TrackerEntry[],
  endDay: "2026-10-17",
  loading: false,
  error: null as string | null,
  saving: false,
  reload: hooks.reload,
  save: hooks.save,
  remove: hooks.remove,
  archive: hooks.archive,
  move: hooks.move,
};

vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "1" }),
  useNavigate: () => hooks.navigate,
}));
vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));
vi.mock("@wwwuabot/ui/dialog", () => ({
  useDialog: () => ({ alert: hooks.alert, confirm: hooks.confirm }),
}));
vi.mock("./useTracker", () => ({ useTracker: () => state }));

const { TrackerPage } = await import("./TrackerPage");

beforeEach(() => {
  vi.clearAllMocks();
  state.tracker = water;
  state.endDay = "2026-10-17";
  state.loading = false;
  state.error = null;
  state.saving = false;
  state.entries = [
    { id: 1, day: "2026-10-17", value: 2, note: "", loggedAt: "2026-10-17 09:00:00" },
    { id: 2, day: "2026-10-16", value: 1.5, note: "після бігу", loggedAt: "2026-10-16 21:10:00" },
    { id: 3, day: "2026-10-15", value: 1, note: "", loggedAt: "2026-10-15 08:00:00" },
  ];
});

describe("звіт", () => {
  it("середнє, серія й дні з записом рахуються з історії", () => {
    const { container } = render(<TrackerPage />);
    const stats = container.querySelector(".wb-tracker-stats") as HTMLElement;

    expect(within(stats).getByText("1,5 л")).toBeTruthy();
    expect(within(stats).getByText("3 з 30")).toBeTruthy();
    expect(within(stats).getByText("3 дн.")).toBeTruthy();
  });

  it("вікно звіту справді звужується", async () => {
    render(<TrackerPage />);

    await userEvent.click(screen.getByRole("tab", { name: "7 дн." }));

    expect(screen.getByText("3 з 7")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "7 дн." }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "30 дн." }).getAttribute("aria-selected")).toBe("false");
  });

  it("ціль виконано — число днів, а не середнє", () => {
    render(<TrackerPage />);

    expect(screen.getByText("1 з 30 · 3%")).toBeTruthy();
  });

  it("порожній трекер каже, з чого почати", () => {
    state.entries = [];
    render(<TrackerPage />);

    expect(screen.getByText(/Записів ще немає/)).toBeTruthy();
  });

  it("⛔ завантаження без дня не падає: вікно ще не будується", () => {
    state.tracker = null;
    state.endDay = "";
    state.loading = true;

    render(<TrackerPage />);

    // Без підпису тут був `RangeError: Invalid time value` з `addTrackerDays("")`.
    expect(screen.getByText("Завантаження…")).toBeTruthy();
  });

  it("⛔ два дотики одного дня — два рядки в історії, а не один", () => {
    state.entries = [
      ...state.entries,
      { id: 4, day: "2026-10-17", value: 0.5, note: "ще склянка", loggedAt: "2026-10-17 13:45:00" },
    ];
    const { container } = render(<TrackerPage />);

    expect(container.querySelectorAll(".wb-tracker-history-row")).toHaveLength(4);
  });
});

describe("запис", () => {
  it("⛔ поле приходить порожнім, а дотик додає новий рядок", async () => {
    render(<TrackerPage />);

    expect((screen.getByLabelText("Значення, л") as HTMLInputElement).value).toBe("");

    await userEvent.type(screen.getByLabelText("Значення, л"), "0.5");
    await userEvent.click(screen.getByRole("button", { name: "Зберегти" }));

    // День не їде в запит: його ставить сервер, тож форма його не питає.
    expect(hooks.save).toHaveBeenCalledWith(0.5, "");
    expect((screen.getByLabelText("Значення, л") as HTMLInputElement).value).toBe("");
    expect(screen.queryByText("Збережено")).toBeNull();
  });

  it("⛔ поля дати на екрані немає — його не обирають, його фіксує момент", () => {
    render(<TrackerPage />);

    expect(screen.queryByLabelText("День")).toBeNull();
    expect(screen.queryByText("Запис дня")).toBeNull();
  });

  it("порожнє поле не стає нулем — екран каже про це", async () => {
    render(<TrackerPage />);

    await userEvent.click(screen.getByRole("button", { name: "Зберегти" }));

    expect(hooks.save).not.toHaveBeenCalled();
    expect(hooks.alert).toHaveBeenCalled();
  });

  it("⛔ рядок історії — не кнопка: минулий вимір не редагується, лише прибирається", () => {
    const { container } = render(<TrackerPage />);
    const first = container.querySelector(".wb-tracker-history-row") as HTMLElement;

    expect(within(first).queryByRole("button", { name: /16\.10/ })).toBeNull();
    expect(within(first).getByRole("button", { name: /Прибрати запис/ })).toBeTruthy();
  });

  it("історія показує час дотика", () => {
    render(<TrackerPage />);

    expect(screen.getByText("09:00")).toBeTruthy();
    expect(screen.getByText("21:10")).toBeTruthy();
  });

  it("прибирання дотика питає підтвердження", async () => {
    render(<TrackerPage />);

    await userEvent.click(screen.getByRole("button", { name: "Прибрати запис 17.10 09:00" }));

    expect(hooks.confirm).toHaveBeenCalled();
    expect(hooks.remove).not.toHaveBeenCalled();

    hooks.confirm.mockResolvedValueOnce(true);
    await userEvent.click(screen.getByRole("button", { name: "Прибрати запис 17.10 09:00" }));
    expect(hooks.remove).toHaveBeenCalledWith(1);
  });
});

describe("прибирання трекера", () => {
  it("без підтвердження нічого не зникає", async () => {
    render(<TrackerPage />);

    await userEvent.click(screen.getByRole("button", { name: /Прибрати трекер/ }));

    expect(hooks.confirm).toHaveBeenCalled();
    expect(hooks.archive).not.toHaveBeenCalled();
  });

  it("після підтвердження веде до списку", async () => {
    hooks.confirm.mockResolvedValueOnce(true);
    render(<TrackerPage />);

    await userEvent.click(screen.getByRole("button", { name: /Прибрати трекер/ }));

    expect(hooks.archive).toHaveBeenCalled();
    expect(hooks.navigate).toHaveBeenCalledWith("/trackers", { replace: true });
  });
});
