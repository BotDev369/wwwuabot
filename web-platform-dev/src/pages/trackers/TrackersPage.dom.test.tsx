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
import { render, screen, within } from "@testing-library/react";
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
  moveGroup: vi.fn(),
  addFrom: vi.fn(),
  moveTracker: vi.fn(),
  libraryReload: vi.fn(),
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
  moveGroup: hooks.moveGroup,
  addFrom: hooks.addFrom,
  moveTracker: hooks.moveTracker,
};

/** Списки на читання: один рядок на шаблон і на публічний трекер. */
const library = {
  templates: [
    {
      source: "catalog:water",
      key: "water",
      title: "Вода",
      meta: "Режим · ціль 2 л",
      added: false,
    },
    {
      source: "catalog:sleep",
      key: "sleep",
      title: "Сон",
      meta: "Режим · ціль 8 год",
      added: true,
    },
  ],
  publicTrackers: [
    {
      source: "public:12",
      key: "public-12",
      title: "Кава вдома",
      meta: "#олена · ціль 3 чашки",
      added: false,
    },
  ],
  loading: false,
  error: null as string | null,
  reload: hooks.libraryReload,
};

vi.mock("react-router-dom", () => ({
  useNavigate: () => hooks.navigate,
  useSearchParams: () => [hooks.params, vi.fn()],
}));
// Хедер у тесті не потрібен (його малює каркас), а контекстний футер —
// потрібен: саме там тепер живуть дії екрана.
vi.mock("@wwwuabot/ui/nav", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@wwwuabot/ui/nav")>()),
  useScreenChrome: () => {},
}));
vi.mock("@wwwuabot/ui/dialog", () => ({
  useDialog: () => ({
    alert: hooks.alert,
    confirm: hooks.confirm,
    prompt: hooks.prompt,
  }),
}));
vi.mock("./useTrackers", () => ({ useTrackers: () => state }));
vi.mock("./useTrackerLibrary", () => ({ useTrackerLibrary: () => library }));

const { TrackersPage } = await import("./TrackersPage");

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  hooks.params = new URLSearchParams();
  state.trackers = [water, steps, coffee];
  state.groups = groups;
  hooks.addFrom.mockResolvedValue({ ...water, id: 2 });
  hooks.moveTracker.mockResolvedValue(true);
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

    // Сьогоднішня клітинка не має окремого вигляду — у ній те саме значення
    // дня (2.5 л): число великим, одиниця дрібним під ним.
    const today = screen.getByRole("button", { name: /Вода, Сб 17/ });
    expect(today.querySelector(".wb-matrix-number")?.textContent).toBe("2,5");
    expect(today.querySelector(".wb-matrix-unit")?.textContent).toBe("л");

    // Минула клітинка — історія: дотик веде на картку трекера.
    await userEvent.click(screen.getByRole("button", { name: /Вода, Чт 15/ }));
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

  it("порожня клітинка — точка, без плюса й заливки, у будь-який день", async () => {
    state.entries = [];
    render(<TrackersPage />);

    await userEvent.click(screen.getByRole("button", { name: "Свої" }));
    const today = screen.getByRole("button", { name: /Кава, Сб 17/ });
    const past = screen.getByRole("button", { name: /Кава, Чт 15/ });
    // Порожньо — «тут нічого»: одна точка, жодного знака дії.
    expect(today.textContent).toBe("·");
    expect(today.querySelector("svg")).toBeNull();
    expect(past.textContent).toBe("·");
  });
});

describe("дії екрана", () => {
  it("підсумок дня прибрано разом із рахунком і смугою", () => {
    render(<TrackersPage />);

    expect(screen.queryByText("Сьогодні записано")).toBeNull();
    expect(document.querySelector(".wb-tracker-day-bar")).toBeNull();
  });

  it("новий трекер відкривається модалкою, а не кашею на сторінці", () => {
    hooks.params = new URLSearchParams({ new: "1" });
    render(<TrackersPage />);

    const dialog = screen.getByRole("dialog", { name: "Новий трекер" });
    expect(dialog).toBeTruthy();
    expect(within(dialog).getByLabelText("Група")).toBeTruthy();
    expect(within(dialog).getByLabelText("Назва")).toBeTruthy();
    // Форма — вміст модалки, а не блок сторінки під нею.
    expect(dialog.querySelector(".wb-tracker-form")).not.toBeNull();
  });

  it("⛔ окремої дії «додати групу» немає — знак створення один, це трекер", () => {
    render(<TrackersPage />);

    // Групу додають з меню самої групи («Додати підгрупу»); другий знак
    // у шапці дублював ту саму дію й забирав місце біля «+».
    expect(screen.queryByRole("button", { name: "Додати групу" })).toBeNull();
    expect(screen.getByRole("button", { name: "Додати трекер" })).toBeTruthy();
  });

  it("«Групи» відкриває дерево груп в модалці, а не на сторінці", async () => {
    render(<TrackersPage />);

    await userEvent.click(screen.getByRole("button", { name: "Групи" }));
    const dialog = screen.getByRole("dialog", { name: "Групи" });
    expect(within(dialog).getByRole("button", { name: "Нова група" })).toBeTruthy();
    // Підгрупа з порядком і діями — усередині модалки, а не під нею.
    expect(within(dialog).getByText("Ранкова рутина")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Дії групи Ранкова рутина" })).toBeTruthy();
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

    const cell = screen.getByRole("button", { name: "Тренування, Сб 17: так" });
    // Статус — знаком, а не числом: «1» у клітинці читалося б як міра.
    expect(cell.textContent).toBe("");
    expect(cell.querySelector("svg")).toBeTruthy();
  });
});

describe("три поверхні", () => {
  it("«Шаблони» — каталог із «Додати», вже додане каже «Додано»", async () => {
    render(<TrackersPage />);
    await userEvent.click(screen.getByRole("tab", { name: "Шаблони" }));

    // Каталог начав нічого не сіє: у «Моїх» він сам не з'являється — тільки копія.
    expect(screen.getByRole("button", { name: "Додати" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Додати" }));

    expect(hooks.addFrom).toHaveBeenCalledWith("catalog:water");
    // «Додано» — це стан кнопки, а не пункт меню: вдруге копію не роблять.
    expect(screen.getByRole("button", { name: "Додано" }).hasAttribute("disabled")).toBe(true);
    expect(hooks.libraryReload).toHaveBeenCalled();
  });

  it("«Публічні» — лише визначення: немає клітинок днів, підпис — ім'я на платформі", async () => {
    render(<TrackersPage />);
    await userEvent.click(screen.getByRole("tab", { name: "Публічні" }));

    expect(screen.getByText("Кава вдома")).toBeTruthy();
    expect(screen.getByText("#олена · ціль 3 чашки")).toBeTruthy();
    // Вимірів у чужій мірці немає й бути не може.
    expect(document.querySelector(".wb-matrix-cell")).toBeNull();
  });

  it("пошук звужує список, а не гортає море пальцем", async () => {
    render(<TrackersPage />);
    await userEvent.click(screen.getByRole("tab", { name: "Шаблони" }));

    await userEvent.type(screen.getByRole("searchbox", { name: "Пошук трекера" }), "сон");

    expect(screen.queryByText("Вода")).toBeNull();
    expect(screen.getByText("Сон")).toBeTruthy();
  });

  it("шапка днів ставить сьогодні першою колонкою", async () => {
    render(<TrackersPage />);
    await userEvent.click(screen.getByRole("button", { name: "Режим" }));

    const head = document.querySelector(".wb-matrix-head");
    expect(head?.textContent).toContain("Сб");
    expect(head?.textContent).toContain("17");
    const firstCell = document.querySelector(".wb-matrix-row .wb-matrix-cell");
    expect(firstCell?.getAttribute("aria-label")).toContain("Сб 17");
    // У шапці — лише дати: дії переїхали в контекстний футер.
    expect(within(head as HTMLElement).queryByRole("button")).toBeNull();
  });

  it("дії екрана живуть у контекстному футері, а не в шапці таблиці", () => {
    render(<TrackersPage />);

    const bar = document.querySelector(".wb-contextbar");
    expect(bar?.getAttribute("aria-label")).toBe("Дії трекерів");
    expect(within(bar as HTMLElement).getByRole("button", { name: "Групи" })).toBeTruthy();
    expect(within(bar as HTMLElement).getByRole("button", { name: "Порядок" })).toBeTruthy();
    expect(within(bar as HTMLElement).getByRole("button", { name: "Додати трекер" })).toBeTruthy();

    const head = document.querySelector(".wb-matrix-head");
    expect(head?.querySelectorAll(".wb-matrix-head-day")).toHaveLength(4);
    // Вкладки й шапка — один закріплений шар, а не два різні за рівнями.
    const sticky = document.querySelector(".wb-trackers-head");
    expect(sticky?.querySelector("[role=tablist]")).not.toBeNull();
    expect(sticky?.querySelector(".wb-matrix-head")).not.toBeNull();
    // Смуга дій стоїть поза закріпленим шаром: вона не рухає таблицю.
    expect(sticky?.querySelector(".wb-contextbar")).toBeNull();
  });

  it("«Порядок» — стан кнопки, і смуга дій це показує", async () => {
    render(<TrackersPage />);

    const order = screen.getByRole("button", { name: "Порядок" });
    expect(order.getAttribute("aria-pressed")).toBe("false");

    await userEvent.click(order);

    expect(order.getAttribute("aria-pressed")).toBe("true");
  });

  it("режим «Порядок» міняє місце стрілками й не дає вийти за межі групи", async () => {
    // Двоє сусідів в одній групі: межа має бути в першого згори й у другого
    // знизу, а в середині — обидві стрілки живі.
    state.trackers = [water, { ...water, id: 5, key: "own-tea", title: "Чай" }, steps, coffee];
    render(<TrackersPage />);
    await userEvent.click(screen.getByRole("button", { name: "Порядок" }));
    await userEvent.click(screen.getByRole("button", { name: "Режим" }));

    // Колонок днів у цьому режимі немає — і шапки теж: вона б лишилась
    // порожнім рядком над стрілками.
    expect(document.querySelector(".wb-matrix-head")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Вода — нижче" }));
    expect(hooks.moveTracker).toHaveBeenCalledWith(1, "down");
    // Перший у групі не йде вгору — межа вимкнена, а не зникає.
    expect(screen.getByRole("button", { name: "Вода — вище" }).hasAttribute("disabled")).toBe(true);
  });

  it("порожні «Мої» ведуть у «Шаблони», а не лишають глухий кут", async () => {
    state.trackers = [];
    render(<TrackersPage />);

    expect(screen.getByText("Трекерів ще немає.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "До шаблонів" }));
    expect(screen.getByRole("tab", { name: "Шаблони" })).toBeTruthy();
  });
});
