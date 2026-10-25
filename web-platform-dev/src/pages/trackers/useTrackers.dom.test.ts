// @vitest-environment jsdom
/**
 * Хук стрічки: перший вхід приходить із даними, а помилки не зникають мовчки.
 *
 * Перевіряємо те, що не видно в розмітці: запит іде з днем людини, створення
 * додає рядок у стан (без перезавантаження), а невдача каже причину.
 *
 * @module web-platform-dev/src/pages/trackers/useTrackers.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { Tracker, TrackerGroup } from "@wwwuabot/shared/trackers";

const mocks = { request: vi.fn(), alert: vi.fn() };

vi.mock("@/shared/api/client", () => ({ apiFetch: mocks.request }));
vi.mock("@wwwuabot/ui/dialog", () => ({ useDialog: () => ({ alert: mocks.alert }) }));

const { useTrackers } = await import("./useTrackers");

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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("стрічка", () => {
  it("запит іде з днем людини, а не з датою воркера", async () => {
    mocks.request.mockResolvedValue({ trackers: [water], entries: [], endDay: "2026-10-17" });
    const view = renderHook(() => useTrackers());

    await waitFor(() => expect(view.result.current.loading).toBe(false));

    expect(mocks.request).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/user\/trackers\?day=/),
    );
    expect(view.result.current.trackers).toHaveLength(1);
    expect(view.result.current.endDay).toBe("2026-10-17");
    // Старий api-dev не вміє `groups`: стрічка лишається з порожнім деревом,
    // а не з `undefined`, яке валило б рендер (`groups.find`).
    expect(view.result.current.groups).toEqual([]);
  });

  it("невдача називає причину і дає повторити", async () => {
    mocks.request.mockRejectedValueOnce(new Error("HTTP 500"));
    const view = renderHook(() => useTrackers());
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    expect(view.result.current.error).toBe("Не вдалося завантажити трекери.");

    mocks.request.mockResolvedValueOnce({ trackers: [water], entries: [], endDay: "2026-10-17" });
    await act(() => view.result.current.reload());
    expect(view.result.current.error).toBeNull();
    expect(view.result.current.trackers).toHaveLength(1);
  });

  it("створення додає трекер у стан — без другого запиту", async () => {
    mocks.request.mockResolvedValueOnce({ trackers: [], entries: [], endDay: "2026-10-17" });
    const view = renderHook(() => useTrackers());
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockResolvedValueOnce({ tracker: { ...water, id: 5, isBuiltin: false } });
    let created: Tracker | null = null;
    await act(async () => {
      created = await view.result.current.create({
        title: "Вода",
        unit: "л",
        step: 0.25,
        goal: 2,
        min: 0,
        max: 20,
        mode: "sum",
        valueType: "number",
      });
    });

    expect(created).toMatchObject({ id: 5 });
    expect(view.result.current.trackers).toHaveLength(1);
  });

  it("відмова сервера каже її словами й не додає рядок", async () => {
    mocks.request.mockResolvedValueOnce({ trackers: [], entries: [], endDay: "2026-10-17" });
    const view = renderHook(() => useTrackers());
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockRejectedValueOnce(new Error("Назва — від 1 до 40 символів."));
    await act(async () => {
      await view.result.current.create({
        title: "",
        unit: "",
        step: 1,
        goal: null,
        min: 0,
        max: null,
        mode: "read",
        valueType: "number",
      });
    });

    expect(mocks.alert).toHaveBeenCalledWith("Назва — від 1 до 40 символів.", { tone: "danger" });
    expect(view.result.current.trackers).toHaveLength(0);
  });

  it("прибирання зникає зі стану, а провал лишає рядок", async () => {
    mocks.request.mockResolvedValueOnce({ trackers: [water], entries: [], endDay: "2026-10-17" });
    const view = renderHook(() => useTrackers());
    await waitFor(() => expect(view.result.current.trackers).toHaveLength(1));

    mocks.request.mockResolvedValueOnce({ ok: true });
    let ok = false;
    await act(async () => {
      ok = await view.result.current.archive(1);
    });
    expect(ok).toBe(true);
    expect(view.result.current.trackers).toHaveLength(0);

    mocks.request.mockRejectedValueOnce(new Error("HTTP 500"));
    await act(async () => {
      await view.result.current.archive(9);
    });
    expect(mocks.alert).toHaveBeenCalledWith("Не вдалося прибрати трекер.", { tone: "danger" });
  });

  it("«додати всю групу» шле джерела пачкою й перечитує стрічку", async () => {
    mocks.request.mockResolvedValueOnce({ trackers: [], entries: [], endDay: "2026-10-17" });
    const view = renderHook(() => useTrackers());
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockResolvedValueOnce({ trackers: [water, { ...water, id: 2 }] });
    mocks.request.mockResolvedValueOnce({ trackers: [water], entries: [], endDay: "2026-10-17" });
    let count = 0;
    await act(async () => {
      count = await view.result.current.addMany(["catalog:water", "catalog:sleep"]);
    });

    expect(mocks.request).toHaveBeenCalledWith(
      "/api/user/trackers",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ sources: ["catalog:water", "catalog:sleep"] }),
      }),
    );
    expect(count).toBe(2);
    // Групи могли з'явитися — стан бере свіжий перелік, а не додає вручну.
    expect(view.result.current.trackers).toHaveLength(1);
  });

  it("очищення групи каже, скільки зникло, а провал — причину", async () => {
    mocks.request.mockResolvedValueOnce({ trackers: [water], entries: [], endDay: "2026-10-17" });
    const view = renderHook(() => useTrackers());
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockResolvedValueOnce({ removed: 3 });
    mocks.request.mockResolvedValueOnce({ trackers: [], entries: [], endDay: "2026-10-17" });
    let removed: number | null = null;
    await act(async () => {
      removed = await view.result.current.clearGroup(11);
    });

    expect(mocks.request).toHaveBeenCalledWith("/api/user/trackers/group/trackers?id=11", {
      method: "DELETE",
    });
    expect(removed).toBe(3);
    expect(view.result.current.trackers).toHaveLength(0);

    mocks.request.mockRejectedValueOnce(new Error("HTTP 500"));
    await act(async () => {
      await view.result.current.clearGroup(11);
    });
    expect(mocks.alert).toHaveBeenCalledWith("Не вдалося прибрати трекери групи.", {
      tone: "danger",
    });
  });
});

describe("скидання дня", () => {
  it("шле трекер і перечитує стрічку — день ставить сервер", async () => {
    mocks.request.mockResolvedValueOnce({ trackers: [water], entries: [], endDay: "2026-10-17" });
    const view = renderHook(() => useTrackers());
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockResolvedValueOnce({ removed: 2 });
    mocks.request.mockResolvedValueOnce({ trackers: [water], entries: [], endDay: "2026-10-17" });
    let removed: number | null = null;
    await act(async () => {
      removed = await view.result.current.clearDay(1);
    });

    expect(mocks.request).toHaveBeenCalledWith("/api/user/trackers/entry?trackerId=1", {
      method: "DELETE",
    });
    expect(removed).toBe(2);
  });

  it("провал скидання каже причину й не вдає, що скинуто", async () => {
    mocks.request.mockResolvedValueOnce({ trackers: [water], entries: [], endDay: "2026-10-17" });
    const view = renderHook(() => useTrackers());
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockRejectedValueOnce(new Error("HTTP 500"));
    let removed: number | null = 1;
    await act(async () => {
      removed = await view.result.current.clearDay(1);
    });

    expect(removed).toBeNull();
    expect(mocks.alert).toHaveBeenCalledWith("Не вдалося скинути сьогоднішні записи.", {
      tone: "danger",
    });
  });
});

describe("запис у клітинці", () => {
  it("запис додає рядок дня — без перезавантаження стрічки", async () => {
    mocks.request.mockResolvedValueOnce({ trackers: [water], entries: [], endDay: "2026-10-17" });
    const view = renderHook(() => useTrackers());
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockResolvedValueOnce({
      entry: { id: 7, day: "2026-10-17", value: 1, note: "", loggedAt: "2026-10-17 10:00:00" },
    });
    let ok = false;
    await act(async () => {
      ok = await view.result.current.save(1, 1, "");
    });

    expect(ok).toBe(true);
    expect(view.result.current.entries).toHaveLength(1);
    expect(view.result.current.entries[0]).toMatchObject({ trackerId: 1, value: 1 });
    expect(view.result.current.saving).toBe(false);
  });

  it("невдалий запис каже причину й не додає рядок", async () => {
    mocks.request.mockResolvedValueOnce({ trackers: [water], entries: [], endDay: "2026-10-17" });
    const view = renderHook(() => useTrackers());
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockRejectedValueOnce(new Error("Значення поза межами трекера."));
    let ok = true;
    await act(async () => {
      ok = await view.result.current.save(1, 1, "");
    });

    expect(ok).toBe(false);
    expect(mocks.alert).toHaveBeenCalledWith("Значення поза межами трекера.", { tone: "danger" });
    expect(view.result.current.entries).toHaveLength(0);
  });

  it("⛔ другий запис під час польоту не йде на сервер", async () => {
    mocks.request.mockResolvedValueOnce({ trackers: [water], entries: [], endDay: "2026-10-17" });
    const view = renderHook(() => useTrackers());
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockReturnValueOnce(new Promise(() => {}));
    await act(async () => {
      void view.result.current.save(1, 1, "");
    });
    let second: boolean | undefined;
    await act(async () => {
      second = await view.result.current.save(1, 2, "");
    });

    expect(second).toBe(false);
    // Завантаження + один запис: другий не долітає.
    expect(mocks.request).toHaveBeenCalledTimes(2);
  });
});

describe("групи стрічки", () => {
  const own: TrackerGroup = { id: 10, parentId: null, title: "Свої", key: "own" };
  const routine: TrackerGroup = { id: 11, parentId: null, title: "Режим", key: "routine" };
  const morning: TrackerGroup = { id: 12, parentId: 11, title: "Ранок", key: null };

  /** Стрічка з уже наявними групами й трекерами — хук після першого кадру. */
  function seeded(groups: TrackerGroup[], trackers: Tracker[] = [water]) {
    mocks.request.mockResolvedValueOnce({ trackers, groups, entries: [], endDay: "2026-10-17" });
    const view = renderHook(() => useTrackers());
    return view;
  }

  it("пересування міняє групу трекера в стані", async () => {
    const view = seeded([own]);
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockResolvedValueOnce({ ok: true });
    let ok = false;
    await act(async () => {
      ok = await view.result.current.move(1, 10);
    });

    expect(ok).toBe(true);
    expect(view.result.current.trackers[0].groupId).toBe(10);
  });

  it("невдале пересування лишає групу й каже про це", async () => {
    const view = seeded([own]);
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockRejectedValueOnce(new Error("HTTP 404"));
    let ok = true;
    await act(async () => {
      ok = await view.result.current.move(1, 10);
    });

    expect(ok).toBe(false);
    expect(mocks.alert).toHaveBeenCalledWith("Не вдалося пересунути трекер.", { tone: "danger" });
    expect(view.result.current.trackers[0].groupId).toBeNull();
  });

  it("нова група додається у дерево без перезавантаження", async () => {
    const view = seeded([own]);
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockResolvedValueOnce({
      group: { id: 14, parentId: null, title: "Дім", key: null },
    });
    let created: TrackerGroup | null = null;
    await act(async () => {
      created = await view.result.current.createGroup("Дім", null);
    });

    expect(created).toMatchObject({ id: 14 });
    expect(view.result.current.groups).toHaveLength(2);
  });

  it("невдала група каже причину й не додає рядок", async () => {
    const view = seeded([own]);
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockRejectedValueOnce(new Error("Забагато груп."));
    let created: TrackerGroup | null = { id: 0, parentId: null, title: "", key: null };
    await act(async () => {
      created = await view.result.current.createGroup("Дім", null);
    });

    expect(created).toBeNull();
    expect(mocks.alert).toHaveBeenCalledWith("Забагато груп.", { tone: "danger" });
    expect(view.result.current.groups).toHaveLength(1);
  });

  it("перейменування міняє назву того самого рядка", async () => {
    const view = seeded([routine]);
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockResolvedValueOnce({
      group: { id: 11, parentId: null, title: "Новий режим", key: "routine" },
    });
    let ok = false;
    await act(async () => {
      ok = await view.result.current.updateGroup(11, { title: "Новий режим" });
    });

    expect(ok).toBe(true);
    expect(view.result.current.groups[0].title).toBe("Новий режим");
  });

  it("невдала правка групи — попередження без зміни стану", async () => {
    const view = seeded([routine]);
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockRejectedValueOnce(new Error("HTTP 500"));
    let ok = true;
    await act(async () => {
      ok = await view.result.current.updateGroup(11, { title: "Новий режим" });
    });

    expect(ok).toBe(false);
    expect(mocks.alert).toHaveBeenCalledWith("Не вдалося змінити групу.", { tone: "danger" });
    expect(view.result.current.groups[0].title).toBe("Режим");
  });

  it("прибирання групи піднімає дітей і трекери на її місце", async () => {
    const lifted: Tracker = { ...water, id: 2, groupId: 11 };
    const view = seeded([own, routine, morning], [water, lifted]);
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockResolvedValueOnce({ ok: true });
    let ok = false;
    await act(async () => {
      ok = await view.result.current.deleteGroup(11);
    });

    expect(ok).toBe(true);
    // Рівень вище — у «Свої» (системний корінь): там і діти, і трекери.
    expect(view.result.current.groups.map((group) => group.id)).toEqual([10, 12]);
    expect(view.result.current.groups[1].parentId).toBe(10);
    expect(view.result.current.trackers[1].groupId).toBe(10);
    expect(view.result.current.trackers[0].groupId).toBeNull();
  });

  it("невдале прибирання лишає дерево й каже про це", async () => {
    const view = seeded([own, routine]);
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockRejectedValueOnce(new Error("HTTP 500"));
    let ok = true;
    await act(async () => {
      ok = await view.result.current.deleteGroup(11);
    });

    expect(ok).toBe(false);
    expect(mocks.alert).toHaveBeenCalledWith("Не вдалося прибрати групу.", { tone: "danger" });
    expect(view.result.current.groups).toHaveLength(2);
  });

  it("рух вгору бере свіжий порядок від сервера, а не збирає його локально", async () => {
    const view = seeded([own, routine]);
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockResolvedValueOnce({ groups: [routine, own] });
    let ok = false;
    await act(async () => {
      ok = await view.result.current.moveGroup(11, "up");
    });

    expect(ok).toBe(true);
    expect(mocks.request).toHaveBeenCalledWith(
      "/api/user/trackers/group",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ id: 11, move: "up" }),
      }),
    );
    expect(view.result.current.groups.map((group) => group.id)).toEqual([11, 10]);
  });

  it("невдалий рух — попередження без зміни стану", async () => {
    const view = seeded([own, routine]);
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockRejectedValueOnce(new Error("HTTP 500"));
    let ok = true;
    await act(async () => {
      ok = await view.result.current.moveGroup(11, "down");
    });

    expect(ok).toBe(false);
    expect(mocks.alert).toHaveBeenCalledWith("Не вдалося змінити порядок груп.", {
      tone: "danger",
    });
    expect(view.result.current.groups.map((group) => group.id)).toEqual([10, 11]);
  });
});

describe("три поверхні", () => {
  const seeded = (trackers: Tracker[] = []) => {
    mocks.request.mockResolvedValueOnce({
      trackers,
      groups: [],
      entries: [],
      endDay: "2026-10-17",
    });
    return renderHook(() => useTrackers());
  };

  it("«додати в мої» шле джерело й додає копію в стрічку", async () => {
    const view = seeded([]);
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockResolvedValueOnce({ tracker: water });
    let added: Tracker | null = null;
    await act(async () => {
      added = await view.result.current.addFrom("catalog:water");
    });

    expect(added).not.toBeNull();
    expect(mocks.request).toHaveBeenCalledWith(
      "/api/user/trackers",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ from: "catalog:water" }),
      }),
    );
    expect(view.result.current.trackers.map((tracker) => tracker.id)).toEqual([1]);
  });

  it("повторне додавання замінює рядок, а не плодить другий", async () => {
    const view = seeded([water]);
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    // Сервер воскрешає той самий рядок (ключ зайнятий) — клієнт не додає копію.
    mocks.request.mockResolvedValueOnce({ tracker: { ...water, groupId: 10 } });
    await act(async () => {
      await view.result.current.addFrom("catalog:water");
    });

    expect(view.result.current.trackers).toHaveLength(1);
    expect(view.result.current.trackers[0].groupId).toBe(10);
  });

  it("невдале додавання каже причину й не чіпає стрічку", async () => {
    const view = seeded([]);
    await waitFor(() => expect(view.result.current.loading).toBe(false));

    mocks.request.mockRejectedValueOnce(new Error("HTTP 404"));
    let added: Tracker | null = water;
    await act(async () => {
      added = await view.result.current.addFrom("public:12");
    });

    expect(added).toBeNull();
    expect(mocks.alert).toHaveBeenCalledWith("HTTP 404", { tone: "danger" });
    expect(view.result.current.trackers).toEqual([]);
  });
});

describe("назва й пріоритет", () => {
  async function seeded() {
    mocks.request.mockResolvedValueOnce({
      trackers: [water],
      groups: [],
      entries: [],
      endDay: "2026-10-17",
    });
    const view = renderHook(() => useTrackers());
    await waitFor(() => expect(view.result.current.loading).toBe(false));
    return view;
  }

  it("нова назва йде PATCH-ом і лягає в стан тим, що відповів сервер", async () => {
    const view = await seeded();
    mocks.request.mockResolvedValueOnce({ title: "Джерельна" });

    let ok = false;
    await act(async () => {
      ok = await view.result.current.rename(1, "Джерельна");
    });

    expect(ok).toBe(true);
    expect(mocks.request).toHaveBeenCalledWith(
      "/api/user/trackers",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ id: 1, title: "Джерельна" }),
      }),
    );
    expect(view.result.current.trackers[0].title).toBe("Джерельна");
  });

  it("пріоритет — ранг рядка; `null` прибирає його", async () => {
    const view = await seeded();
    mocks.request.mockResolvedValueOnce({ priority: 5 });
    await act(async () => {
      await view.result.current.setPriority(1, 5);
    });
    expect(view.result.current.trackers[0].priority).toBe(5);

    mocks.request.mockResolvedValueOnce({ priority: null });
    await act(async () => {
      await view.result.current.setPriority(1, null);
    });
    expect(mocks.request.mock.calls.pop()?.[1]).toMatchObject({
      body: JSON.stringify({ id: 1, priority: null }),
    });
    expect(view.result.current.trackers[0].priority).toBeNull();
  });

  it("невдала зміна каже причину й лишає рядок як був", async () => {
    const view = await seeded();
    mocks.request.mockRejectedValueOnce(new Error("HTTP 400"));

    let ok = true;
    await act(async () => {
      ok = await view.result.current.rename(1, "Джерельна");
    });

    expect(ok).toBe(false);
    expect(mocks.alert).toHaveBeenCalledWith("Не вдалося змінити назву.", { tone: "danger" });
    expect(view.result.current.trackers[0].title).toBe("Вода");
  });
});
