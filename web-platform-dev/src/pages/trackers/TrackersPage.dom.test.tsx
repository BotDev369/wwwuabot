// @vitest-environment jsdom
/**
 * «Трекери»: рядок показує сьогоднішнє значення, серію й тиждень.
 *
 * Ламається мовчки саме тут: день без запису легко стає нулем (і людина
 * читає «0 кроків» замість «не записано»), а картка без адреси обіцяє
 * перехід, якого немає.
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
    { trackerId: 1, day: "2026-10-17", value: 2, note: "" },
    { trackerId: 1, day: "2026-10-16", value: 1.5, note: "" },
    { trackerId: 2, day: "2026-10-14", value: 7, note: "" },
  ];
  state.loading = false;
  state.error = null;
});

describe("стрічка трекерів", () => {
  it("картка показує сьогоднішнє значення з одиницею", () => {
    render(<TrackersPage />);

    expect(screen.getByText("2 л")).toBeTruthy();
  });

  it("⛔ день без запису — це «—», а не «0»", () => {
    render(<TrackersPage />);

    expect(screen.getByText("—")).toBeTruthy();
    expect(screen.queryByText("0 год")).toBeNull();
  });

  it("підпис каже серію й ціль — за ними й вертаються", () => {
    render(<TrackersPage />);

    expect(screen.getByText("серія 2 дн. · ціль 2 л")).toBeTruthy();
    expect(screen.getByText("останній запис 14.10 · ціль 8 год")).toBeTruthy();
  });

  it("скільки записано сьогодні видно в шапці", () => {
    render(<TrackersPage />);

    expect(screen.getByText("Сьогодні записано: 1 з 2")).toBeTruthy();
  });

  it("дотик по картці веде саме на цей трекер", async () => {
    render(<TrackersPage />);

    await userEvent.click(screen.getByRole("button", { name: /Вода/ }));

    expect(hooks.navigate).toHaveBeenCalledWith("/trackers/1");
  });

  it("порожній список каже, як додати перший", () => {
    state.trackers = [];
    state.entries = [];
    render(<TrackersPage />);

    expect(screen.getByText("Трекерів ще немає.")).toBeTruthy();
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
});
