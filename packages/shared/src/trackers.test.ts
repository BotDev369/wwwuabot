import { describe, expect, it } from "vitest";
import {
  TRACKER_CATALOG,
  TRACKER_CATALOG_GROUPS,
  TRACKER_LIMITS,
  TRACKER_OWN_GROUP_KEY,
  addTrackerDays,
  buildTrackerGroupTree,
  countTrackerGroupNode,
  flattenTrackerGroupTree,
  formatTrackerAmount,
  isWritableTrackerDay,
  isValidTrackerDay,
  parseTrackerSource,
  todayTrackerDay,
  trackerCopyKey,
  trackerAmountText,
  trackerValue,
  validateTrackerFields,
  validateTrackerGroupFields,
  type TrackerDayValue,
  type TrackerGroup,
} from "./trackers";
import { trackerDayLast, trackerDayTotals } from "./trackers/analytics";

function entry(day: string, value: number): TrackerDayValue {
  return { day, value };
}

describe("стандартні трекери", () => {
  it("ключі не повторюються, а ціль лежить у межах", () => {
    const keys = TRACKER_CATALOG.map((tracker) => tracker.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const tracker of TRACKER_CATALOG) {
      expect(tracker.title.length).toBeGreaterThan(0);
      // Межі — ті самі, що валідує форма: каталог не має права їх ламати.
      expect(tracker.title.length).toBeLessThanOrEqual(TRACKER_LIMITS.title);
      expect(tracker.unit.length).toBeLessThanOrEqual(TRACKER_LIMITS.unit);
      expect(TRACKER_CATALOG_GROUPS.map((group) => group.key)).toContain(tracker.groupKey);
      expect(tracker.step).toBeGreaterThan(0);
      expect(tracker.max === null || tracker.max > tracker.min).toBe(true);
      if (tracker.goal !== null) {
        expect(tracker.goal).toBeGreaterThanOrEqual(tracker.min);
        expect(tracker.max === null || tracker.goal <= tracker.max).toBe(true);
      }
    }
  });
});

describe("дні", () => {
  it("приймає лише реальну дату без часу", () => {
    expect(isValidTrackerDay("2026-02-28")).toBe(true);
    expect(isValidTrackerDay("2026-02-31")).toBe(false);
    expect(isValidTrackerDay("2026-2-3")).toBe(false);
    expect(isValidTrackerDay("2026-02-28T10:00:00Z")).toBe(false);
  });

  it("зсув переходить через місяць і рік", () => {
    expect(addTrackerDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addTrackerDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addTrackerDays("2026-03-29", 1)).toBe("2026-03-30");
  });

  it("майбутнє записати не можна, а «завтра» приймаємо через часові зони", () => {
    const now = new Date("2026-05-10T12:00:00Z");
    const today = todayTrackerDay(now);
    expect(isWritableTrackerDay(today, now)).toBe(true);
    expect(isWritableTrackerDay(addTrackerDays(today, 1), now)).toBe(true);
    expect(isWritableTrackerDay(addTrackerDays(today, 2), now)).toBe(false);
  });
});

describe("форма власного трекера", () => {
  it("обрізає назву й одиницю та приймає порожню одиницю", () => {
    const result = validateTrackerFields({ title: "  Кава  ", unit: "чашок", step: 1 });
    expect(result).toEqual({
      ok: true,
      value: {
        title: "Кава",
        unit: "чашок",
        step: 1,
        goal: null,
        min: 0,
        max: null,
        mode: "read",
        valueType: "number",
      },
    });
  });

  it("вид без цілі — «читати», з ціллею — «додавати»; явний вибір священний", () => {
    expect(validateTrackerFields({ title: "Вага", step: 0.1 })).toMatchObject({
      value: { mode: "read" },
    });
    expect(validateTrackerFields({ title: "Кава", step: 1, goal: 3 })).toMatchObject({
      value: { mode: "sum" },
    });
    expect(validateTrackerFields({ title: "Сон", step: 0.5, goal: 8, mode: "read" })).toMatchObject(
      {
        value: { mode: "read" },
      },
    );
  });

  it("⛔ порожня назва не створює трекер", () => {
    expect(validateTrackerFields({ title: "   ", step: 1 }).ok).toBe(false);
    expect(validateTrackerFields({ title: "x".repeat(TRACKER_LIMITS.title + 1), step: 1 }).ok).toBe(
      false,
    );
  });

  it("⛔ максимум мусить бути більшим за мінімум, ціль — у межах", () => {
    expect(validateTrackerFields({ title: "Вага", step: 0.1, min: 10, max: 5 }).ok).toBe(false);
    expect(validateTrackerFields({ title: "Вага", step: 0.1, min: 0, max: 5, goal: 8 }).ok).toBe(
      false,
    );
    expect(validateTrackerFields({ title: "Вага", step: 0, min: 0 }).ok).toBe(false);
  });

  it("невідомий тип — не поломка, а число", () => {
    expect(validateTrackerFields({ title: "Кава", step: 1, valueType: "так-ні" })).toMatchObject({
      value: { valueType: "number" },
    });
  });
});

describe("тип запису «так-ні»", () => {
  it("не має одиниці, кроку й цілі — тип ставить межу 0…1 сам", () => {
    const result = validateTrackerFields({
      title: "Не палю",
      valueType: "boolean",
      // Приховані формою поля не впливають на результат, а не «проходять повз».
      unit: "днів",
      goal: 5,
      step: 999,
      mode: "sum",
    });

    expect(result).toEqual({
      ok: true,
      value: {
        title: "Не палю",
        unit: "",
        step: 1,
        goal: null,
        min: 0,
        max: 1,
        mode: "sum",
        valueType: "boolean",
      },
    });
  });

  it("без явного виду — «останній»: статус дня, а не сума", () => {
    expect(validateTrackerFields({ title: "Тренування", valueType: "boolean" })).toMatchObject({
      value: { mode: "read" },
    });
  });

  it("запис: 1 і 0 — у межах, записаний «ні» — не відмова", () => {
    const habit = { min: 0, max: 1 };
    expect(trackerValue(1, habit)).toBe(1);
    expect(trackerValue(0, habit)).toBe(0);
    expect(trackerValue(2, habit)).toBeNull();
  });

  it("показ: статус словом, число — з одиницею", () => {
    const habit = { valueType: "boolean" as const, unit: "" };
    expect(trackerAmountText(1, habit)).toBe("так");
    expect(trackerAmountText(0, habit)).toBe("ні");
    expect(trackerAmountText(null, habit)).toBe("—");
    expect(trackerAmountText(2.5, { valueType: "number", unit: "л" })).toBe("2,5 л");
    expect(trackerAmountText(0, { valueType: "number", unit: "" })).toBe("0");
  });
});

describe("значення", () => {
  it("поза межами трекера — відмова, а не обрізане число", () => {
    const mood = { min: 1, max: 5 };
    expect(trackerValue(4, mood)).toBe(4);
    expect(trackerValue(0, mood)).toBeNull();
    expect(trackerValue(6, mood)).toBeNull();
    expect(trackerValue(Number.NaN, mood)).toBeNull();
    expect(trackerValue("4", mood)).toBeNull();
  });
});

describe("суми дня", () => {
  it("⛔ два дотики одного дня — одна сума, а не два дні", () => {
    const totals = trackerDayTotals([entry("2026-05-10", 0.5), entry("2026-05-10", 1)]);
    expect(totals.get("2026-05-10")).toBe(1.5);
  });

  it("вимір дня — останній дотик, а не сума", () => {
    const last = trackerDayLast([
      { day: "2026-05-10", value: 0.5 },
      { day: "2026-05-10", value: 1.5 },
    ]);
    expect(last.get("2026-05-10")).toBe(1.5);
  });

  it("значення з одиницею читається як мірка", () => {
    expect(formatTrackerAmount(2.5, "л")).toBe("2,5 л");
    expect(formatTrackerAmount(8000, "")).toMatch(/^8\s000$/);
  });
});

function group(id: number, parentId: number | null, title = `Г${id}`): TrackerGroup {
  return { id, parentId, title, key: null };
}

describe("дерево груп", () => {
  it("глибина не обмежена: три рівні — один ланцюг, а не помилка", () => {
    const tree = buildTrackerGroupTree([group(1, null), group(2, 1), group(3, 2)]);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.children[0]?.children[0]?.group.id).toBe(3);
    // Рахунок рекурсивний: згорнутий акордеон показує й підгрупи.
    tree[0]?.trackers.push(10, 11);
    tree[0]?.children[0]?.trackers.push(12);
    expect(countTrackerGroupNode(tree[0]!)).toBe(3);
  });

  it("сирота не зникає — вона стає верхнім рівнем", () => {
    const tree = buildTrackerGroupTree([group(5, 999)]);
    expect(tree.map((node) => node.group.id)).toEqual([5]);
  });

  it("сплащений список іде з відступом за рівнем — для селекта", () => {
    const options = flattenTrackerGroupTree(
      buildTrackerGroupTree([group(1, null), group(2, 1), group(3, null)]),
    );
    expect(options.map((option) => [option.group.id, option.depth])).toEqual([
      [1, 0],
      [2, 1],
      [3, 0],
    ]);
  });
});

describe("форма групи", () => {
  it("назва мусить бути після trim і не довшою за межу", () => {
    expect(validateTrackerGroupFields({ title: "  Ранкова рутина " })).toEqual({
      ok: true,
      value: { title: "Ранкова рутина", parentId: null },
    });
    expect(validateTrackerGroupFields({ title: "   " }).ok).toBe(false);
    expect(validateTrackerGroupFields({ title: "x".repeat(41) }).ok).toBe(false);
  });

  it("батько — номер або порожньо; між собою — не число", () => {
    expect(validateTrackerGroupFields({ title: "A", parentId: 7 })).toEqual({
      ok: true,
      value: { title: "A", parentId: 7 },
    });
    expect(validateTrackerGroupFields({ title: "A", parentId: -1 }).ok).toBe(false);
    expect(validateTrackerGroupFields({ title: "A", parentId: 1.5 }).ok).toBe(false);
  });

  it("системний ключ «Свої» — у каталозі й останній", () => {
    expect(TRACKER_CATALOG_GROUPS.at(-1)?.key).toBe(TRACKER_OWN_GROUP_KEY);
  });
});

describe("звідки копія", () => {
  it("каталог приймає лише наявний ключ, а не будь-який рядок", () => {
    expect(parseTrackerSource("catalog:water")).toEqual({ kind: "catalog", key: "water" });
    expect(parseTrackerSource("catalog:вигадка")).toBeNull();
  });

  it("публічний — додатний номер; нуль, дробове й текст — не джерело", () => {
    expect(parseTrackerSource("public:12")).toEqual({ kind: "public", id: 12 });
    expect(parseTrackerSource("public:0")).toBeNull();
    expect(parseTrackerSource("public:1.5")).toBeNull();
    expect(parseTrackerSource("public:вода")).toBeNull();
  });

  it("не джерело: інший префікс, порожнє значення, не рядок", () => {
    expect(parseTrackerSource("tracker:12")).toBeNull();
    expect(parseTrackerSource("catalog:")).toBeNull();
    expect(parseTrackerSource(12)).toBeNull();
  });

  it("ключ копії не зіштовхується зі своїм: каталог — свій, чужий — `public-<id>`", () => {
    expect(trackerCopyKey({ kind: "catalog", key: "water" })).toBe("water");
    expect(trackerCopyKey({ kind: "public", id: 12 })).toBe("public-12");
  });
});
