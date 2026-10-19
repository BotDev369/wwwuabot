// @vitest-environment jsdom
/**
 * «Трекери»: група тематики й плитка «знак + назва» — більше нічого.
 *
 * Поле запису зі стрічки прибрано (запис живе на сторінці трекера), тож тут
 * перевіряємо відсутністю: ні поля, ні кнопки «Записати», ні підписів стану.
 * Групи йдуть порядком каталогу, «Свої» — останні; смуга дня лишається.
 *
 * @module web-platform-dev/src/pages/trackers/TrackersPage.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Tracker, TrackerEntryRow } from "@wwwuabot/shared/trackers";

const hooks = {
  navigate: vi.fn(),
  params: new URLSearchParams(),
  create: vi.fn(),
  reload: vi.fn(),
  archive: vi.fn(),
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
  isBuiltin: true,
  mode: "sum",
};

const sleep: Tracker = {
  id: 2,
  key: "sleep",
  title: "Сон",
  unit: "год",
  step: 0.5,
  goal: 8,
  min: 0,
  max: 24,
  icon: "moon",
  isBuiltin: true,
  mode: "sum",
};

const steps: Tracker = {
  id: 3,
  key: "steps",
  title: "Кроки",
  unit: "кроків",
  step: 500,
  goal: 8000,
  min: 0,
  max: 100000,
  icon: "footsteps",
  isBuiltin: true,
  mode: "sum",
};

const coffee: Tracker = {
  id: 4,
  key: "own-coffee",
  title: "Кава",
  unit: "мл",
  step: 50,
  goal: null,
  min: 0,
  max: 1000,
  icon: "bar-chart",
  isBuiltin: false,
  mode: "sum",
};

const state = {
  trackers: [] as Tracker[],
  entries: [] as TrackerEntryRow[],
  endDay: "2026-10-17",
  loading: false,
  error: null as string | null,
  reload: hooks.reload,
  create: hooks.create,
  archive: hooks.archive,
};

vi.mock("react-router-dom", () => ({
  useNavigate: () => hooks.navigate,
  useSearchParams: () => [hooks.params, vi.fn()],
}));
vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));
vi.mock("./useTrackers", () => ({ useTrackers: () => state }));

const { TrackersPage } = await import("./TrackersPage");

beforeEach(() => {
  vi.clearAllMocks();
  hooks.params = new URLSearchParams();
  state.trackers = [water, sleep];
  state.entries = [
    { id: 1, trackerId: 1, day: "2026-10-17", value: 2, note: "", loggedAt: "2026-10-17 09:00:00" },
    {
      id: 2,
      trackerId: 1,
      day: "2026-10-16",
      value: 1.5,
      note: "",
      loggedAt: "2026-10-16 09:00:00",
    },
    { id: 3, trackerId: 2, day: "2026-10-14", value: 7, note: "", loggedAt: "2026-10-14 09:00:00" },
  ];
  state.loading = false;
  state.error = null;
});

describe("стрічка трекерів", () => {
  it("⛔ картка — лише знак і назва: ні поля, ні кнопки «Записати», ні підписів", () => {
    const { container } = render(<TrackersPage />);

    const card = screen.getByRole("button", { name: /Вода/ });
    expect(card.textContent).toBe("Вода");
    expect(container.querySelector(".wb-tracker-card input")).toBeNull();
    expect(screen.queryByLabelText(/Записати/)).toBeNull();
    expect(container.querySelector(".wb-tracker-card-meta")).toBeNull();
    // Графік і звіт лишаються на окремій сторінці трекера.
    expect(container.querySelector(".wb-tracker-chart")).toBeNull();
    expect(container.querySelector(".wb-tracker-stats")).toBeNull();
  });

  it("стрічка групиться тематиками: порядок каталогу, «Свої» останні", () => {
    state.trackers = [coffee, water, sleep, steps];
    const { container } = render(<TrackersPage />);

    const groups = [...container.querySelectorAll(".wb-trackers-group")];
    expect(
      groups.map((group) => group.querySelector(".wb-trackers-group-title")?.textContent),
    ).toEqual(["Активність", "Режим", "Свої"]);
    const own = groups[groups.length - 1];
    expect(own?.textContent).toContain("Кава");
    expect(own?.textContent).not.toContain("Вода");
  });

  it("скільки записано сьогодні видно в шапці й на смузі дня", () => {
    const { container } = render(<TrackersPage />);

    expect(container.querySelector(".wb-tracker-day-count")?.textContent).toBe("1");
    expect(container.querySelector(".wb-tracker-day-total")?.textContent).toBe("з 2");
    expect(container.querySelectorAll(".wb-tracker-day-seg")).toHaveLength(2);
    expect(container.querySelectorAll(".wb-tracker-day-seg--on")).toHaveLength(1);
  });

  it("дотик по заголовку веде на цей трекер", async () => {
    render(<TrackersPage />);

    await userEvent.click(screen.getByRole("button", { name: /Вода/ }));

    expect(hooks.navigate).toHaveBeenCalledWith("/trackers/1");
  });

  it("ціль і стан дня лише на сторінці трекера, не в стрічці", () => {
    state.entries = [];
    const { container } = render(<TrackersPage />);

    expect(container.querySelector(".wb-tracker-card-meta")).toBeNull();
    expect(screen.queryByText("ціль 2 л")).toBeNull();
  });

  it("порожній список каже, як додати перший, і не малює смугу дня", () => {
    state.trackers = [];
    state.entries = [];
    const { container } = render(<TrackersPage />);

    expect(screen.getByText("Трекерів ще немає.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Створити трекер" })).toBeTruthy();
    expect(container.querySelector(".wb-tracker-day")).toBeNull();
  });

  it("«+» відкриває форму в адресі, а не в локальному стані", async () => {
    render(<TrackersPage />);

    await userEvent.click(screen.getByRole("button", { name: "Додати трекер" }));

    expect(hooks.navigate).toHaveBeenCalledWith("/trackers?new=1");
  });

  it("?new=1 показує форму власного трекера", () => {
    hooks.params = new URLSearchParams("new=1");
    render(<TrackersPage />);

    expect(screen.getByText("Свій трекер")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Створити" })).toBeTruthy();
  });

  it("⛔ крок у формі створення без дефолтної цифри", () => {
    hooks.params = new URLSearchParams("new=1");
    render(<TrackersPage />);

    expect((screen.getByLabelText("Крок") as HTMLInputElement).value).toBe("");
  });
});
