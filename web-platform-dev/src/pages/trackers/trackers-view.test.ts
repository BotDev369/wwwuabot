import { describe, expect, it } from "vitest";
import type {
  Tracker,
  TrackerEntry,
  TrackerEntryRow,
  TrackerGroup,
} from "@wwwuabot/shared/trackers";
import {
  cellAmount,
  changeAmountLabel,
  changeLabel,
  dayLabel,
  goalLabel,
  groupRowsTree,
  groupTreeLines,
  historySince,
  matrixDayLabel,
  matrixDayNumber,
  matrixDays,
  matrixWeekday,
  newestFirst,
  readingBand,
  signedAmount,
  timeLabel,
  trackerCells,
  trackerDraftSummary,
  whenLabel,
} from "./trackers-view";

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

const weight: Tracker = {
  id: 2,
  key: "own-weight",
  title: "Вага",
  unit: "кг",
  step: 0.1,
  goal: null,
  min: 0,
  max: 400,
  icon: "bar-chart",
  groupId: 13,
  isBuiltin: false,
  mode: "read",
  valueType: "number",
};

describe("групи стрічки", () => {
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

  const groups: TrackerGroup[] = [
    { id: 10, parentId: null, title: "Режим", key: "routine" },
    { id: 11, parentId: null, title: "Активність", key: "activity" },
    { id: 12, parentId: 11, title: "Ранкова рутина", key: null },
    { id: 13, parentId: null, title: "Свої", key: "own" },
  ];

  it("дерево будується за батьками, «Свої» збирає й безгрупових", () => {
    const grouped: Tracker[] = [
      { ...weight, groupId: 13 },
      { ...water, groupId: 10 },
      steps, // groupId: 12 → підгрупа «Ранкова рутина»
      coffee, // groupId: null → «Свої»
    ];
    const tree = groupRowsTree(grouped, groups);

    // Порядок верхнього рівня — порядок списку груп; «Свої» (13) — теж корінь.
    expect(tree.map((node) => node.group.id)).toEqual([10, 11, 13]);
    // Підгрупа живе під батьком, а не поруч.
    expect(tree[1]?.children.map((node) => node.group.id)).toEqual([12]);
    expect(tree[1]?.trackers).toHaveLength(0);
    // Рахунок рекурсивний: згорнутий заголовок каже й про підгрупу.
    expect(tree[1]?.count).toBe(1);
    // «Свої» збирає і свій трекер, і той, що без групи.
    expect(tree[2]?.trackers.map((tracker) => tracker.id).sort()).toEqual([2, 4]);
  });

  it("порожня тематика каталогу не показується — порожня полиця це шум", () => {
    const bare: TrackerGroup[] = [
      { id: 10, parentId: null, title: "Режим", key: "routine" },
      { id: 14, parentId: null, title: "Гроші", key: "money" },
    ];
    const tree = groupRowsTree([{ ...water, groupId: 10 }], bare);

    expect(tree.map((node) => node.group.id)).toEqual([10]);
    expect(tree[0]?.trackers).toHaveLength(1);
  });

  it("створена людиною група видима навіть порожня — разом із батьком", () => {
    const tree = groupRowsTree([{ ...water, groupId: 10 }], groups);

    // «Ранкова рутина» (12) — власна (key === null) і без жодного трекера;
    // її батько «Активність» (11) теж лишається, інакше підгрупа зникла б з екрана.
    expect(tree.map((node) => node.group.id)).toEqual([10, 11]);
    expect(tree[1]?.children.map((node) => node.group.id)).toEqual([12]);
    expect(tree[1]?.count).toBe(0);
  });
});

describe("дерево груп модалки", () => {
  const groups: TrackerGroup[] = [
    { id: 10, parentId: null, title: "Режим", key: "routine" },
    { id: 11, parentId: null, title: "Активність", key: "activity" },
    { id: 12, parentId: 11, title: "Ранкова рутина", key: null },
    { id: 13, parentId: null, title: "Свої", key: "own" },
  ];

  it("DFS: підгрупа — одразу після батька, зі своєю глибиною", () => {
    const lines = groupTreeLines(groups);

    expect(lines.map((line) => [line.group.id, line.depth])).toEqual([
      [10, 0],
      [11, 0],
      [12, 1],
      [13, 0],
    ]);
  });

  it("межі сусідів: крайній корінь не йде вгору, єдиний син — нікуди", () => {
    const lines = new Map(groupTreeLines(groups).map((line) => [line.group.id, line]));

    expect(lines.get(10)).toMatchObject({ first: true, last: false });
    expect(lines.get(13)).toMatchObject({ first: false, last: true });
    // Єдина підгрупа — і перша, і остання: обидві стрілки вимкнені.
    expect(lines.get(12)).toMatchObject({ first: true, last: true });
  });

  it("сирота й цикл не зникають із дерева", () => {
    const lines = groupTreeLines([
      { id: 20, parentId: 99, title: "Сирота", key: null },
      { id: 21, parentId: 22, title: "А", key: null },
      { id: 22, parentId: 21, title: "Б", key: null },
    ]);

    // Сирота — на верхньому рівні; цикл не замикає обхід і теж рядки.
    expect(lines.map((line) => line.group.id)).toEqual([20, 21, 22]);
    expect(lines.every((line) => line.depth === 0)).toBe(true);
  });
});

describe("матриця днів", () => {
  it("вікно починається сьогодні й іде в минуле", () => {
    // Сьогодні — перша колонка ліворуч: екран відкривають, щоб записати
    // сьогодні, а не прочитати тиждень.
    expect(matrixDays("2026-10-17", 4)).toEqual([
      "2026-10-17",
      "2026-10-16",
      "2026-10-15",
      "2026-10-14",
    ]);
  });

  it("підпис дня читається як «день тижня + число»", () => {
    // 2026-10-17 — субота.
    expect(matrixDayLabel("2026-10-17")).toBe("Сб 17");
    // Шапка бере ті самі частини окремо: день тижня над числом.
    expect(matrixWeekday("2026-10-17")).toBe("Сб");
    expect(matrixDayNumber("2026-10-17")).toBe(17);
  });

  it("клітинка sum — сума дня, read — останній вимір", () => {
    const entries: TrackerEntryRow[] = [
      {
        id: 1,
        trackerId: 1,
        day: "2026-10-17",
        value: 1,
        note: "",
        loggedAt: "2026-10-17 08:00:00",
      },
      {
        id: 2,
        trackerId: 1,
        day: "2026-10-17",
        value: 1.5,
        note: "",
        loggedAt: "2026-10-17 20:00:00",
      },
    ];
    const days = ["2026-10-17"];

    expect(trackerCells(water, entries, days)[0]?.value).toBe(2.5);
    const reading: Tracker = { ...water, mode: "read", goal: null };
    expect(trackerCells(reading, entries, days)[0]?.value).toBe(1.5);
  });

  it("день без запису — null, а не нуль", () => {
    const cells = trackerCells(water, [], ["2026-10-17"]);
    expect(cells[0]?.value).toBeNull();
    expect(cells[0]?.goalMet).toBe(false);
  });

  it("ціль досягнута — клітинка каже про це, без цілі — не каже", () => {
    const entries: TrackerEntryRow[] = [
      {
        id: 1,
        trackerId: 1,
        day: "2026-10-17",
        value: 2.5,
        note: "",
        loggedAt: "2026-10-17 08:00:00",
      },
    ];
    expect(trackerCells(water, entries, ["2026-10-17"])[0]?.goalMet).toBe(true);
    const goalless: Tracker = { ...water, goal: null };
    expect(trackerCells(goalless, entries, ["2026-10-17"])[0]?.goalMet).toBe(false);
  });

  it("число клітинки коротшає лише до тисяч", () => {
    expect(cellAmount(null, water)).toBe("");
    expect(cellAmount(2.5, water)).toBe("2,5");
    // `uk-UA` розділяє тисячі нерозривним пробілом — тому не рядок, а схема.
    expect(cellAmount(9999, water)).toMatch(/^9\s999$/);
    expect(cellAmount(12000, water)).toBe("12к");
  });

  it("«так-ні» не числи́ться: клітинка несе статус, і нуль — теж запис", () => {
    const habit: Tracker = { ...water, valueType: "boolean", unit: "" };

    expect(cellAmount(1, habit)).toBe("так");
    // Записаний «ні» — це статус дня, а не порожня клітинка.
    expect(cellAmount(0, habit)).toBe("ні");
    expect(cellAmount(null, habit)).toBe("");
  });
});

describe("підписи", () => {
  it("історія — найновіше першим, у межах дня — за часом", () => {
    const source: TrackerEntry[] = [
      { id: 1, day: "2026-10-17", value: 1, note: "", loggedAt: "2026-10-17 09:00:00" },
      { id: 2, day: "2026-10-17", value: 3, note: "", loggedAt: "2026-10-17 21:00:00" },
      { id: 3, day: "2026-10-16", value: 2, note: "", loggedAt: "2026-10-16 12:00:00" },
    ];
    const sorted = newestFirst(source);

    expect(sorted.map((entry) => entry.id)).toEqual([2, 1, 3]);
    expect(source[0].id).toBe(1);
  });

  it("два дотики в одну секунду — новіший номер все одно вище", () => {
    const sameSecond: TrackerEntry[] = [
      { id: 4, day: "2026-10-17", value: 1, note: "", loggedAt: "2026-10-17 21:00:00" },
      { id: 9, day: "2026-10-17", value: 2, note: "", loggedAt: "2026-10-17 21:00:00" },
    ];

    expect(newestFirst(sameSecond).map((entry) => entry.id)).toEqual([9, 4]);
  });

  it("час дотика — з моменту запису, без нього — порожньо", () => {
    expect(timeLabel("2026-10-17 09:05:00")).toBe("09:05");
    expect(timeLabel(null)).toBe("");
    expect(timeLabel("17.10")).toBe("");
  });

  it("дата запису — «сьогодні» / «вчора» / коротка дата", () => {
    expect(whenLabel("2026-10-17", "2026-10-17")).toBe("сьогодні");
    expect(whenLabel("2026-10-16", "2026-10-17")).toBe("вчора");
    expect(whenLabel("2026-10-05", "2026-10-17")).toBe("05.10");
  });

  it("вікно бере запас на попередній період — інакше зміни не з чим порівняти", () => {
    expect(historySince("2026-10-17", 7)).toBe("2026-10-04");
  });

  it("день у списку — короткий, без року", () => {
    expect(dayLabel("2026-10-05")).toBe("05.10");
  });

  it("ціль показуємо лише тоді, коли вона є", () => {
    expect(goalLabel(water)).toBe("ціль 2 л");
    expect(goalLabel({ ...water, goal: null })).toBeNull();
  });

  it("зсув — зі знаком, бо без нього «0,5 кг» не каже напрямку", () => {
    expect(signedAmount(-0.5, "кг")).toBe("−0,5 кг");
    expect(signedAmount(1.5, "год")).toBe("+1,5 год");
    expect(signedAmount(0, "бал")).toBe("0 бал");
    expect(changeAmountLabel(null, "кг", 30)).toBeNull();
    expect(changeAmountLabel(0, "кг", 30)).toBe("Без змін за 30 дн.");
    expect(changeAmountLabel(-0.5, "кг", 30)).toBe("−0,5 кг за 30 дн.");
  });

  it("зміна — словами, а не стрілкою: «більше» не завжди добре", () => {
    expect(changeLabel(null)).toBeNull();
    expect(changeLabel(0.4)).toBe("Як у попередній період");
    expect(changeLabel(12.4)).toBe("Більше на 12,4%");
    expect(changeLabel(-8)).toBe("Менше на 8%");
  });

  it("діапазон лінії — навколо значень, а не від нуля", () => {
    const band = readingBand([78, 79.5], null);

    expect(band.min).toBeLessThan(78);
    expect(band.max).toBeGreaterThan(79.5);
    // Вага з ціллю: ціль входить у діапазон — відстань до неї і є сенс графіка.
    expect(readingBand([79], 60).min).toBeLessThanOrEqual(60);
    expect(readingBand([], null)).toEqual({ min: 0, max: 1 });
  });
});

describe("огляд чернетки нового трекера", () => {
  it("число без одиниці й цілі — теж повний рядок, а не обріз", () => {
    expect(trackerDraftSummary({ valueType: "number", unit: "", goal: null })).toBe(
      "Число · без одиниці",
    );
  });

  it("одиниця й ціль — кожна своїм словом, без повтору одиниці в цілі", () => {
    expect(trackerDraftSummary({ valueType: "number", unit: "чашок", goal: 3 })).toBe(
      "Число · чашок · ціль 3",
    );
    // Дробова ціль — тим самим форматом, що й скрізь у продукті.
    expect(trackerDraftSummary({ valueType: "number", unit: "л", goal: 2.5 })).toBe(
      "Число · л · ціль 2,5",
    );
  });

  it("«так-ні» не числиться — одиниці й цілі в нього немає", () => {
    expect(trackerDraftSummary({ valueType: "boolean", unit: "кг", goal: 70 })).toBe(
      "Так-ні · статус дня",
    );
  });
});
