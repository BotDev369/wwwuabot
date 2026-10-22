// @vitest-environment jsdom
/**
 * «Трекери» — акордеон груп + матриця днів: дерево груп із рахунком, дотик
 * по назві веде на картку, по сьогоднішній клітинці відкриває форму запису,
 * по минулій — теж веде на картку (день ставить сервер); вибір групи
 * пам'ятається в localStorage, а не в стані сторінки.
 *
 * @module web-platform-dev/src/pages/trackers/TrackersPage.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Tracker, TrackerEntryRow, TrackerGroup } from "@wwwuabot/shared/trackers";

const hooks = {
  navigate: vi.fn(),
  params: new URLSearchParams(),
  create: vi.fn(),
  reload: vi.fn(),
  archive: vi.fn(),
  save: vi.fn(),
  move: vi.fn(),
  createGroup: vi.fn(),
  updateGroup: vi.fn(),
  deleteGroup: vi.fn(),
  prompt: vi.fn(),
  confirm: vi.fn(),
  alert: vi.fn(),
};

const groups: TrackerGroup[] = [
  { id: 10, parentId: null, title: "Режим", key: "routine" },
  { id: 11, parentId: null, title: "Активність", key: "activity" },
  { id: 12, parentId: 11, title: "Ранкова рутина", key: null },
  { id: 13, parentId: null, title: "Свої", key: "own" },
];

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
  groupId: 10,
  isBuiltin: true,
  mode: "sum",
  valueType: "number",
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
  groupId: 12,
  isBuiltin: true,
  mode: "sum",
  valueType: "number",
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
  groupId: null,
  isBuiltin: false,
  mode: "sum",
  valueType: "number",
};

const state = {
  trackers: [] as Tracker[],
  groups,
  entries: [] as TrackerEntryRow[],
  endDay: "2026-10-17",
  loading: false,
  saving: false,
  error: null as string | null,
  reload: hooks.reload,
  create: hooks.create,
  archive: hooks.archive,
  save: hooks.save,
  move: hooks.move,
  createGroup: hooks.createGroup,
  updateGroup: hooks.updateGroup,
  deleteGroup: hooks.deleteGroup,
};

vi.mock("react-router-dom", () => ({
  useNavigate: () => hooks.navigate,
  useSearchParams: () => [hooks.params, vi.fn()],
}));
vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));
vi.mock("@wwwuabot/ui/dialog", () => ({
  useDialog: () => ({
    alert: hooks.alert,
    confirm: hooks.confirm,
    prompt: hooks.prompt,
  }),
}));
vi.mock("./useTrackers", () => ({ useTrackers: () => state }));

const { TrackersPage } = await import("./TrackersPage");

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  hooks.params = new URLSearchParams();
  state.trackers = [water, steps, coffee];
  state.groups = groups;
  state.entries = [
    {
      id: 1,
      trackerId: 1,
      day: "2026-10-17",
      value: 2.5,
      note: "",
      loggedAt: "2026-10-17 09:00:00",
    },
  ];
  state.loading = false;
  state.saving = false;
  state.error = null;
});

describe("акордеон груп", () => {
  it("дефолт — усі згорнуті; згорнутий заголовок несе рекурсивний рахунок", () => {
    const { container } = render(<TrackersPage />);

    const toggles = screen.getAllByRole("button", { expanded: false });
    expect(toggles.length).toBeGreaterThan(0);
    // Активність: один трекер у підгрупі — рахунок рекурсивний, не лише свої.
    const active = toggles.find((toggle) => toggle.textContent?.includes("Активність"));
    expect(active?.textContent).toContain("1");
    // Згорнутий акордеон не ховає рахунок, але ховає вміст.
    expect(container.querySelector(".wb-matrix")).toBeNull();
    expect(screen.getByText("Свої")).toBeTruthy();
  });

  // Точні імена, а не регулярка: кнопка дій має підпис «Дії групи …», а
  // клітинки — «Назва, день», тож нерозривний збіг збирає по два елементи.
  it("дотик розгортає групу й показує матрицю з назвою трекера", async () => {
    render(<TrackersPage />);

    await userEvent.click(screen.getByRole("button", { name: "Режим" }));

    expect(screen.getByRole("button", { name: "Вода" })).toBeTruthy();
  });

  it("підгрупа малюється під батьком, а не поруч", async () => {
    render(<TrackersPage />);

    await userEvent.click(screen.getByRole("button", { name: "Активність" }));
    expect(screen.getByRole("button", { name: "Ранкова рутина" })).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Ранкова рутина" }));
    expect(screen.getByRole("button", { name: "Кроки" })).toBeTruthy();
  });

  it("стан розгорнутості пам'ятається в localStorage", async () => {
    const first = render(<TrackersPage />);
    await userEvent.click(screen.getByRole("button", { name: "Режим" }));
    first.unmount();

    render(<TrackersPage />);

    // Після повторного входу група лишається розгорнутою — вибір людини.
    expect(screen.getByRole("button", { name: "Вода" })).toBeTruthy();
    expect(localStorage.getItem("wb-tracker-groups-open")).toContain("10");
  });
});

describe("матриця днів", () => {
  it("клітинка сьогодні відкриває форму запису, минула — веде на картку", async () => {
    render(<TrackersPage />);
    await userEvent.click(screen.getByRole("button", { name: "Режим" }));

    // Сьогоднішня клітинка виділена класом і несе суму дня (2.5 л).
    const today = screen.getByRole("button", { name: /Вода, 2026-10-17/ });
    expect(today.className).toContain("wb-matrix-cell--today");
    expect(today.textContent).toBe("2,5");

    // Минула клітинка — історія: дотик веде на картку трекера.
    await userEvent.click(screen.getByRole("button", { name: /Вода, 2026-10-15/ }));
    expect(hooks.navigate).toHaveBeenCalledWith("/trackers/1");

    // Сьогоднішня відкриває форму — і сейв іде тим самим шляхом, що й на картці.
    await userEvent.click(today);
    await userEvent.type(screen.getByLabelText("Вода, л"), "1");
    await userEvent.click(screen.getByRole("button", { name: "Записати" }));
    expect(hooks.save).toHaveBeenCalledWith(1, 1, "");
  });

  it("назва трекера веде на картку", async () => {
    render(<TrackersPage />);
    await userEvent.click(screen.getByRole("button", { name: "Режим" }));

    await userEvent.click(screen.getByRole("button", { name: "Вода" }));

    expect(hooks.navigate).toHaveBeenCalledWith("/trackers/1");
  });

  it("порожня сьогоднішня клітинка кличе плюсом, порожня минула — мовчить точкою", async () => {
    state.entries = [];
    render(<TrackersPage />);

    await userEvent.click(screen.getByRole("button", { name: "Свої" }));
    const today = screen.getByRole("button", { name: /Кава, 2026-10-17/ });
    // Плюс — запрошення записати; точка — «тут нічого», без другого підпису.
    expect(today.querySelector("svg")).toBeTruthy();
    const past = screen.getByRole("button", { name: /Кава, 2026-10-15/ });
    expect(past.textContent).toBe("·");
  });
});

describe("дії екрана", () => {
  it("підсумок дня прибрано разом із рахунком і смугою", () => {
    render(<TrackersPage />);

    expect(screen.queryByText("Сьогодні записано")).toBeNull();
    expect(document.querySelector(".wb-tracker-day-bar")).toBeNull();
  });

  it("⛔ окремої дії «додати групу» немає — знак створення один, це трекер", () => {
    render(<TrackersPage />);

    // Групу додають з меню самої групи («Додати підгрупу»); другий знак
    // у шапці дублював ту саму дію й забирав місце біля «+».
    expect(screen.queryByRole("button", { name: "Додати групу" })).toBeNull();
    expect(screen.getByRole("button", { name: "Додати трекер" })).toBeTruthy();
  });

  it("«так-ні» у матриці несе статус, а не число", async () => {
    state.trackers = [
      {
        ...water,
        id: 9,
        key: "own-habit",
        title: "Тренування",
        unit: "",
        goal: null,
        groupId: null,
        isBuiltin: false,
        valueType: "boolean",
      },
    ];
    state.entries = [
      {
        id: 9,
        trackerId: 9,
        day: "2026-10-17",
        value: 1,
        note: "",
        loggedAt: "2026-10-17 08:00:00",
      },
    ];
    render(<TrackersPage />);

    await userEvent.click(screen.getByRole("button", { name: "Свої" }));

    expect(screen.getByRole("button", { name: "Тренування, 2026-10-17: так" })).toBeTruthy();
  });
});
