// @vitest-environment jsdom
/**
 * Екран «Аналіз Дат» рендериться, а не тільки компілюється.
 *
 * Аналіз і співставлення — один екран: дат може бути одна або більше, а крок
 * вибору систем стоїть на тій самій адресі. Регресія тут не падає в тестах, а
 * просто зникає з екрана, тож перевіряється саме те, що видно людині: крок,
 * порожній стан, помилка й таблиця з одним і двома стовпцями.
 *
 * @module packages/ui/src/blocks/mydate-analysis.dom.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { DateAnalysisBlock } from "./DateAnalysisBlock";

const SYSTEM = {
  id: "western",
  name: "Західна астрологія",
  description: "Знак, стихія",
  implemented: true,
  parameters: [
    { key: "sunSign", label: "Знак Сонця" },
    { key: "element", label: "Стихія" },
  ],
};

function props(over: Record<string, unknown> = {}): BlockComponentProps {
  return {
    block: { id: "b1", type: "date-analysis", order: 0, props: over },
    zone: "main",
    context: {} as BlockComponentProps["context"],
  };
}

/** Заглушка API: реєстр систем плюс усе, що має приїхати на крок результатів. */
function stubApi(
  result: {
    ok?: boolean;
    error?: string;
    matrix?: Record<string, Record<string, Record<string, string>>>;
    details?: Record<string, Record<string, Record<string, { about?: string; meaning?: string }>>>;
    names?: Record<string, string>;
  } = {},
  systems: unknown[] = [SYSTEM],
): { calls: string[] } {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(String(url));
      const body = String(url).includes("/api/mydate/systems")
        ? { ok: true, systems }
        : { ok: true, ...result };
      return new Response(JSON.stringify(body), { status: 200 });
    }),
  );
  return { calls };
}

/** Порожній реєстр: екран має сказати «нема чого показувати», а не мовчати. */
function stubEmptyRegistry(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ ok: true, systems: [] }), { status: 200 })),
  );
}

/**
 * Дочекатися, поки запит з `useEffect` відпрацює: інакше він переживе тест,
 * і заглушка зніметься вже під ним — справжній `fetch` не приймає відносний URL.
 */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/**
 * Адреса, на яку пішов блок: `pushState` тут не працює — це інший екран.
 * `location` підмінюється, тож оригінал зберігається: інакше наступний тест не
 * прочитав би `search` і вважав, що дат немає.
 */
let savedLocation: PropertyDescriptor | undefined;

function captureNavigation(): { value: () => string } {
  savedLocation ??= Object.getOwnPropertyDescriptor(window, "location");
  const real = window.location;
  let href = "";
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      get search() {
        return real.search;
      },
      get pathname() {
        return real.pathname;
      },
      get href() {
        return href;
      },
      set href(next: string) {
        href = next;
      },
    },
  });
  return { value: () => href };
}

beforeEach(() => {
  window.history.replaceState({}, "", "/mydate/analysis?dates=1980-03-03");
});

afterEach(async () => {
  // `useEffect`.fetch` може ще летіти, коли тест уже скінчився: зняття
  // заглушки перетворило б його на справжній `fetch` з відносним URL, тобто
  // на «Invalid URL» поза тестом. Спершу даємо ланцюжку обіцянок дійти кінця.
  await new Promise((resolve) => setTimeout(resolve, 0));
  vi.unstubAllGlobals();
  if (!savedLocation) return;
  Object.defineProperty(window, "location", savedLocation);
  savedLocation = undefined;
});

describe("DateAnalysisBlock — без дат", () => {
  it("каже, що дат немає, і дає шлях до їхнього списку", () => {
    window.history.replaceState({}, "", "/mydate/analysis");
    render(<DateAnalysisBlock {...props({ backUrl: "/mydate" })} />);
    expect(screen.getByText("Немає дат для аналізу.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Обрати дати" }).getAttribute("href")).toBe("/mydate");
    expect(screen.queryByRole("table")).toBeNull();
  });
});

describe("DateAnalysisBlock — крок вибору систем", () => {
  it("без `?sys=` показує вибір, а не готовий результат", async () => {
    window.history.replaceState({}, "", "/mydate/analysis?dates=1980-03-03,2004-10-07");
    stubApi();
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(screen.getByText("Оберіть системи та параметри")).toBeTruthy();
    // Дат може бути більше однієї — крок каже, скільки їх насправді.
    expect(screen.getByText("Дат в аналізі: 2")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Аналізувати" })).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("не питає аналіз, поки систем не обрано: рахувати ще нема чого", async () => {
    window.history.replaceState({}, "", "/mydate/analysis?dates=1980-03-03");
    const api = stubApi();
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(api.calls.some((url) => url.includes("/api/mydate/compare"))).toBe(false);
  });

  it("веде на ту саму адресу і несе вибір параметрами", async () => {
    window.history.replaceState({}, "", "/mydate/analysis?dates=1980-03-03");
    stubApi();
    const user = userEvent.setup();
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    const nav = captureNavigation();
    await user.click(screen.getByRole("button", { name: "Аналізувати" }));

    // Дати — параметром, а не сегментом: `ScenarioPage` бере весь splat як slug.
    expect(nav.value()).toBe("/mydate/analysis?dates=1980-03-03&sys=western&p=sunSign%2Celement");
  });

  it("адреса однієї дати (`?date=`) веде тим самим шляхом", async () => {
    window.history.replaceState({}, "", "/mydate/analysis?date=1980-03-03");
    stubApi();
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(screen.getByText("Дат в аналізі: 1")).toBeTruthy();
  });
});

describe("DateAnalysisBlock — таблиця", () => {
  it("з однією датою малює параметр у рядку, а значення — у стовпці", async () => {
    window.history.replaceState({}, "", "/mydate/analysis?dates=1980-03-03&sys=western&p=sunSign");
    stubApi({ matrix: { "1980-03-03": { western: { sunSign: "Риби" } } } });
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(screen.getByRole("heading", { name: "Аналіз Дат" })).toBeTruthy();
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByText("03.03.1980")).toBeTruthy();
    expect(screen.getByText("Західна астрологія")).toBeTruthy();
    expect(screen.getByText("Риби")).toBeTruthy();
    // `?p=` звузив перелік: другого параметра на екрані немає.
    expect(screen.queryByText("Стихія")).toBeNull();
  });

  it("дві дати — два стовпці, і під датою стоїть її назва", async () => {
    window.history.replaceState(
      {},
      "",
      "/mydate/analysis?dates=1980-03-03,2004-10-07&sys=western&p=sunSign",
    );
    stubApi({
      matrix: {
        "1980-03-03": { western: { sunSign: "Риби" } },
        "2004-10-07": { western: { sunSign: "Терези" } },
      },
      names: { "2004-10-07": "Донька" },
    });
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(screen.getByText("03.03.1980")).toBeTruthy();
    expect(screen.getByText("07.10.2004")).toBeTruthy();
    expect(screen.getByText("Донька")).toBeTruthy();
    expect(screen.getByText("Риби")).toBeTruthy();
    expect(screen.getByText("Терези")).toBeTruthy();
  });

  it("рядки згруповано за системами: назва системи стоїть перед своїми параметрами", async () => {
    window.history.replaceState({}, "", "/mydate/analysis?dates=1980-03-03&sys=western,vedic");
    stubApi({ matrix: { "1980-03-03": { western: { sunSign: "Риби" } } } }, [
      SYSTEM,
      { ...SYSTEM, id: "vedic", name: "Ведична астрологія" },
    ]);
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    // Обидві назви — по одному разу: група стоїть перед своїми параметрами, а
    // не перед кожним рядком.
    expect(screen.getAllByText("Західна астрологія")).toHaveLength(1);
    expect(screen.getAllByText("Ведична астрологія")).toHaveLength(1);
  });

  it("`?dates=` з тим самим номером двічі дає один стовпець", async () => {
    window.history.replaceState(
      {},
      "",
      "/mydate/analysis?dates=1980-03-03,1980-03-03&sys=western&p=sunSign",
    );
    stubApi({ matrix: { "1980-03-03": { western: { sunSign: "Риби" } } } });
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(screen.getAllByText("03.03.1980")).toHaveLength(1);
  });

  it("рядок розкривається: пояснення параметра й трактування значення", async () => {
    window.history.replaceState({}, "", "/mydate/analysis?dates=1980-03-03&sys=western&p=sunSign");
    stubApi({
      matrix: { "1980-03-03": { western: { sunSign: "Риби" } } },
      details: {
        "1980-03-03": { western: { sunSign: { about: "Сонце в знаку", meaning: "Дія, старт." } } },
      },
    });
    const user = userEvent.setup();
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    // Згорнутий рядок каже рівно два факти — параметр і значення.
    expect(screen.queryByText("Сонце в знаку")).toBeNull();
    expect(screen.queryByText("Дія, старт.")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Знак Сонця" }));

    expect(screen.getByText("Сонце в знаку")).toBeTruthy();
    expect(screen.getByText("Дія, старт.")).toBeTruthy();
  });

  it("пустий реєстр не малює систем, а таблиця каже, що даних немає", async () => {
    window.history.replaceState({}, "", "/mydate/analysis?dates=1980-03-03&sys=western");
    stubEmptyRegistry();
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(screen.queryByText("Західна астрологія")).toBeNull();
    expect(screen.getByText("Немає даних для відображення")).toBeTruthy();
  });

  it("помилку сервера показує людині, а не лишає порожню таблицю", async () => {
    window.history.replaceState({}, "", "/mydate/analysis?dates=1980-03-03&sys=western");
    stubApi({ ok: false, error: "Немає дат" });
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(screen.getByText("Немає дат")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("«Змінити системи» веде на вибір і не губить дати", async () => {
    window.history.replaceState(
      {},
      "",
      "/mydate/analysis?dates=1980-03-03,2004-10-07&sys=western&p=sunSign",
    );
    stubApi({ matrix: { "1980-03-03": { western: { sunSign: "Риби" } } } });
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    const link = screen.getByRole("link", { name: "Змінити системи" });
    expect(link.getAttribute("href")).toBe("/mydate/analysis?dates=1980-03-03%2C2004-10-07");
  });
});

describe("DateAnalysisBlock — підпис екрана", () => {
  const TABLE_URL = "/mydate/analysis?dates=1980-03-03&sys=western&p=sunSign";

  // Стара обіцянка лишилась у `page_data` рядків, створених до зміни тексту, а
  // міграцію в дев-базі запускає людина: без нормалізації екран показував би її.
  it("старий підпис із `page_data` показує текстом, який у коді", async () => {
    window.history.replaceState({}, "", TABLE_URL);
    stubApi({ matrix: { "1980-03-03": { western: { sunSign: "Риби" } } } });
    render(<DateAnalysisBlock {...props({ title: "Порівняння дат" })} />);
    await settle();

    expect(screen.getByRole("heading", { name: "Аналіз Дат" })).toBeTruthy();
    expect(screen.queryByText("Порівняння дат")).toBeNull();
  });

  it("підпис, який людина написала сама, лишається як є", async () => {
    window.history.replaceState({}, "", TABLE_URL);
    stubApi({ matrix: { "1980-03-03": { western: { sunSign: "Риби" } } } });
    render(<DateAnalysisBlock {...props({ title: "  Що каже моя дата  " })} />);
    await settle();

    expect(screen.getByRole("heading", { name: "Що каже моя дата" })).toBeTruthy();
  });
});
