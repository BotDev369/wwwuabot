// @vitest-environment jsdom
/**
 * «Мій день» — перший екран: привітання, серія, плитки й обрані мірки.
 *
 * Ламається мовчки в трьох місцях: порожній день, що малює нулі замість
 * підказки; підпис, який обіцяє «і сьогодні теж», коли сьогодні порожньо; і
 * рядок мірки без стану, тож людина не бачить, що вже записано.
 *
 * @module web-platform-dev/src/pages/day/MyDayPage.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Tracker, TrackerEntryRow } from "@wwwuabot/shared/trackers";
import { todayTrackerDay } from "@wwwuabot/shared/trackers";
import { TRACKERS_PATH } from "@/app/routes";

const hooks = {
  navigate: vi.fn(),
  profile: { profile: { firstName: "Сергій" } } as {
    profile: { firstName?: string; platformUsername?: string } | null;
  },
  trackers: {
    trackers: [] as Tracker[],
    entries: [] as TrackerEntryRow[],
    loading: false,
    error: null as string | null,
  },
};

vi.mock("react-router-dom", () => ({ useNavigate: () => hooks.navigate }));
vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));
vi.mock("@/pages/useProfile", () => ({ useProfile: () => hooks.profile }));
vi.mock("@/pages/trackers/useTrackers", () => ({ useTrackers: () => hooks.trackers }));

const { MyDayPage } = await import("./MyDayPage");

const today = todayTrackerDay();

const tracker = (id: number, title: string, priority: number | null): Tracker => ({
  id,
  key: `tracker-${id}`,
  title,
  unit: "л",
  step: 1,
  goal: 2,
  min: 0,
  max: 20,
  icon: "droplet",
  groupId: null,
  isBuiltin: false,
  mode: "sum",
  valueType: "number",
  priority,
});

const entry = (trackerId: number, day: string): TrackerEntryRow => ({
  id: trackerId * 100,
  trackerId,
  day,
  value: 1,
  note: "",
  loggedAt: `${day} 09:00:00`,
});

beforeEach(() => {
  hooks.navigate.mockReset();
  hooks.profile = { profile: { firstName: "Сергій" } };
  hooks.trackers = { trackers: [], entries: [], loading: false, error: null };
});

describe("стани екрана", () => {
  it("завантаження каже, що рахує, а не малює порожнечу", () => {
    hooks.trackers = { trackers: [], entries: [], loading: true, error: null };

    render(<MyDayPage />);

    expect(screen.getByText("Рахую твій тиждень…")).toBeTruthy();
  });

  it("помилка показує її текст, а не порожній день", () => {
    hooks.trackers = { trackers: [], entries: [], loading: false, error: "Немає зв’язку." };

    render(<MyDayPage />);

    expect(screen.getByText("Немає зв’язку.")).toBeTruthy();
  });

  it("перший день: підказка замість нулів і перехід у Трекери", async () => {
    render(<MyDayPage />);

    expect(screen.getByText("нічого не обрано")).toBeTruthy();
    expect(screen.getByText(/Познач у Трекерах мірки/)).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Відкрити Трекери" }));
    expect(hooks.navigate).toHaveBeenCalledWith(TRACKERS_PATH);
  });
});

describe("дані на екрані", () => {
  it("привітання зветься людину на ім'я", () => {
    render(<MyDayPage />);

    expect(screen.getByText(/, Сергій$/)).toBeTruthy();
  });

  it("обрані мірки: записано / чекає, і плитка рахує тих, хто чекає", () => {
    hooks.trackers = {
      trackers: [tracker(1, "Вода", 1), tracker(2, "Кроки", 2), tracker(3, "Кава", null)],
      entries: [entry(1, today)],
      loading: false,
      error: null,
    };

    render(<MyDayPage />);

    expect(screen.getByRole("button", { name: /Вода.*записано/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Кроки.*чекає/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Кава/ })).toBeNull();
    expect(screen.getByText("1 чекає сьогодні")).toBeTruthy();
    expect(screen.getByText("справи")).toBeTruthy();
  });

  it("серія з учора не обіцяє запису сьогодні", () => {
    hooks.trackers = {
      trackers: [tracker(1, "Вода", 1)],
      entries: [entry(1, "2026-11-16"), entry(1, "2026-11-15")],
      loading: false,
      error: null,
    };

    render(<MyDayPage />);

    expect(screen.getByText("поспіль — сьогодні ще нічого")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Вода.*чекає/ })).toBeTruthy();
  });

  it("сьогоднішній запис — це «і сьогодні теж» і «усе записано»", () => {
    hooks.trackers = {
      trackers: [tracker(1, "Вода", 1)],
      entries: [entry(1, today)],
      loading: false,
      error: null,
    };

    render(<MyDayPage />);

    expect(screen.getByText("поспіль — і сьогодні теж")).toBeTruthy();
    expect(screen.getByText("усе записано")).toBeTruthy();
  });
});
