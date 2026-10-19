// @vitest-environment jsdom
/**
 * «Трекери»: рядок на мірку — знак, назва, стан дня й порожнє поле запису.
 *
 * Ламається мовчки саме тут: дефолтне число в полі читається як чиясь вимога,
 * кнопка без значення стає порожнім дотиком, а дотик по полю не повинен
 * відкривати сторінку трекера. Підпис під назвою — це стан («ціль 8 год» до
 * запису, «сьогодні 2 л» після), а не аналітика: графіка й звіту на стрічці
 * немає, і це перевіряється відсутністю, а не сподіванням.
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
  addEntry: vi.fn(async () => ({ id: 9, day: "2026-10-17", value: 0.5, note: "", loggedAt: null })),
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

const state = {
  trackers: [] as Tracker[],
  entries: [] as TrackerEntryRow[],
  endDay: "2026-10-17",
  loading: false,
  error: null as string | null,
  reload: hooks.reload,
  create: hooks.create,
  archive: hooks.archive,
  addEntry: hooks.addEntry,
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
  it("рядок — знак, назва й поле; графіка й звіту на ньому немає", () => {
    const { container } = render(<TrackersPage />);

    expect(screen.getByRole("button", { name: /Вода/ })).toBeTruthy();
    expect(screen.getByLabelText("Записати: Вода")).toBeTruthy();
    // Графік і звіт лишаються на окремій сторінці трекера; у рядку — лише стан.
    expect(container.querySelector(".wb-tracker-chart")).toBeNull();
    expect(container.querySelector(".wb-tracker-stats")).toBeNull();
  });

  it("підпис під назвою каже стан: ціль до запису, суму дня після", () => {
    const { container } = render(<TrackersPage />);
    const cards = [...container.querySelectorAll(".wb-tracker-card")];
    const meta = (title: string) =>
      cards
        .find((card) => card.textContent?.includes(title))
        ?.querySelector(".wb-tracker-card-meta-text")?.textContent;

    expect(meta("Вода")).toBe("2 л");
    expect(meta("Сон")).toBe("ціль 8 год");
    expect(cards[0]?.querySelector(".wb-tracker-card-check")).toBeTruthy();
    expect(cards[1]?.querySelector(".wb-tracker-card-check")).toBeNull();
  });

  it("⛔ поле завжди порожнє — дефолтне число в ньому не живе", () => {
    render(<TrackersPage />);

    expect((screen.getByLabelText("Записати: Вода") as HTMLInputElement).value).toBe("");
  });

  it("одиниця стоїть підписом поруч із полем, а не дефолтним числом", () => {
    render(<TrackersPage />);

    expect((screen.getByLabelText("Записати: Вода") as HTMLInputElement).value).toBe("");
    expect(screen.getByText("л")).toBeTruthy();
    expect(screen.getByText("год")).toBeTruthy();
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

  it("порожнє поле не має кнопки надсилання", () => {
    render(<TrackersPage />);

    expect(screen.queryByRole("button", { name: "Записати Вода" })).toBeNull();
  });

  it("швидкий запис надсилає число й очищує поле — без підтвердження", async () => {
    render(<TrackersPage />);

    await userEvent.type(screen.getByLabelText("Записати: Вода"), "0.5");
    await userEvent.click(screen.getByRole("button", { name: "Записати Вода" }));

    expect(hooks.addEntry).toHaveBeenCalledWith(1, 0.5);
    expect((screen.getByLabelText("Записати: Вода") as HTMLInputElement).value).toBe("");
    expect(screen.queryByText("Збережено")).toBeNull();
  });

  it("ціль стоїть у рядку до запису — а після нього її міняє сума дня", () => {
    state.entries = [];
    const { container } = render(<TrackersPage />);

    // Стан дня й підпис будуються з тих самих рядків: `rowStatus` і `toTrackerRows`
    // перевірені в `trackers-view.test.ts`, але рядок мусить їх справді показати.
    expect(container.querySelector(".wb-tracker-card-meta-text")?.textContent).toBe("ціль 2 л");
    expect(container.querySelector(".wb-tracker-card-check")).toBeNull();
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
