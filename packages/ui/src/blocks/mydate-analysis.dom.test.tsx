// @vitest-environment jsdom
/**
 * Блоки аналізу рендеряться, а не тільки компілюються.
 *
 * Три блоки (`date-analysis`, `compare-systems`, `compare-table`) жили без жодного
 * тесту: їхня логіка — це «показати картки або сказати, чому нічого не
 * показати». Регресія тут не падає в тестах, а просто зникає з екрана, тож
 * перевіряється саме те, що видно людині: порожній стан, помилка й дані.
 *
 * @module packages/ui/src/blocks/mydate-analysis.dom.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { CompareSystemsBlock } from "./CompareSystemsBlock";
import { CompareTableBlock } from "./CompareTableBlock";
import { DateAnalysisBlock } from "./DateAnalysisBlock";

const SYSTEM = {
  id: "western",
  name: "Західна астрологія",
  description: "Знак, стилемент, ruling planet",
  implemented: true,
  parameters: [{ key: "sign", label: "Знак" }],
};

function props(over: Record<string, unknown> = {}): BlockComponentProps {
  return {
    block: { id: "b1", type: "x", order: 0, props: over },
    zone: "main",
    context: {} as BlockComponentProps["context"],
  };
}

/** Відповідь на будь-який запит: реєстр систем + збережений аналіз. */
function stubApi(matrix?: Record<string, Record<string, Record<string, string>>>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const body = url.includes("/api/mydate/systems")
        ? { ok: true, systems: [SYSTEM] }
        : url.includes("/api/mydate/compare")
          ? { ok: true, matrix }
          : { ok: true, systems: {} };
      return new Response(JSON.stringify(body), { status: 200 });
    }),
  );
}

/** Порожній реєстр: екрани мають сказати «нема чого показувати», а не мовчати. */
function stubEmptyApi() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const body = url.includes("/api/mydate/compare")
        ? { ok: false, error: "Немає дат" }
        : { ok: true, systems: [] };
      return new Response(JSON.stringify(body), { status: 200 });
    }),
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

beforeEach(() => {
  window.history.replaceState({}, "", "/mydate/analysis?date=1980-03-03");
});

afterEach(async () => {
  // `useEffect`.fetch` може ще летіти, коли тест уже скінчився: зняття
  // заглушки перетворило б його на справжній `fetch` з відносним URL, тобто
  // на «Invalid URL» поза тестом. Спершу даємо ланцюжку обіцянок дійти кінця.
  await new Promise((resolve) => setTimeout(resolve, 0));
  vi.unstubAllGlobals();
});

describe("DateAnalysisBlock", () => {
  it("без дати каже, що дата невірна, і дає шлях назад", () => {
    window.history.replaceState({}, "", "/mydate/analysis");
    render(<DateAnalysisBlock {...props({ backUrl: "/mydate" })} />);
    expect(screen.getByText("Невірний формат дати.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Спробувати ще раз" }).getAttribute("href")).toBe(
      "/mydate",
    );
  });

  it("показує картку системи з датою з адреси", async () => {
    stubApi();
    render(<DateAnalysisBlock {...props()} />);
    await settle();
    expect(screen.getByText("Західна астрологія")).toBeTruthy();
    expect(screen.getByText("03.03.1980")).toBeTruthy();
  });

  it("порожній реєстр не ламає екран і не вигадує систем", async () => {
    stubEmptyApi();
    render(<DateAnalysisBlock {...props()} />);
    expect(screen.queryByText("Західна астрологія")).toBeNull();
  });
});

describe("CompareSystemsBlock", () => {
  it("без дат каже про це, а не показує порожній вибір", async () => {
    window.history.replaceState({}, "", "/mydate/compare/systems");
    stubEmptyApi();
    render(<CompareSystemsBlock {...props()} />);
    await settle();
    expect(screen.getByText("Не знайдено дат для аналізу.")).toBeTruthy();
  });

  it("лічить дати з адреси й перелічує системи", async () => {
    window.history.replaceState({}, "", "/mydate/compare/systems?dates=1980-03-03");
    stubApi();
    render(<CompareSystemsBlock {...props()} />);
    expect(screen.getByText("Дат для співставлення: 1")).toBeTruthy();
    await settle();
    expect(screen.getByText("Західна астрологія")).toBeTruthy();
  });
});

describe("CompareTableBlock", () => {
  it("помилку співставлення показує людині, а не лишає порожню таблицю", async () => {
    window.history.replaceState({}, "", "/mydate/compare/table?dates=1980-03-03");
    stubEmptyApi();
    render(<CompareTableBlock {...props()} />);
    await settle();
    expect(screen.getByText("Немає дат")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("без дат не малює таблицю", () => {
    window.history.replaceState({}, "", "/mydate/compare/table");
    render(<CompareTableBlock {...props()} />);
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("з датами показує назву системи у шапці", async () => {
    window.history.replaceState(
      {},
      "",
      "/mydate/compare/table?dates=1980-03-03&sys=western&p=sign",
    );
    stubApi({ "1980-03-03": { western: { sign: "Овен" } } });
    render(<CompareTableBlock {...props()} />);
    await settle();
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByText("Західна астрологія")).toBeTruthy();
    expect(screen.getByText("Овен")).toBeTruthy();
  });
});

/** Система з двома параметрами: на ній видно і трактування, і фільтр `?p=`. */
const ANALYSIS_SYSTEM = {
  id: "western",
  name: "Західна астрологія",
  description: "Знак, стихія",
  implemented: true,
  parameters: [
    { key: "sunSign", label: "Знак Сонця" },
    { key: "element", label: "Стихія" },
  ],
};

const ANALYSIS_RESULT = {
  parameters: [
    { key: "sunSign", label: "Знак Сонця", value: "Риби", hint: "Розчинення меж і чутливість." },
    { key: "element", label: "Стихія", value: "Вода", hint: "Вплив радше відчувається." },
  ],
  comingSoon: [],
};

/**
 * Заглушка кроку результатів: реєстр, збережений аналіз і розрахунок нової
 * системи. `analyzed` рахує звернення до `/analyze`, бо саме воно відрізняє
 * крок «покажи» від кроку «порахуй».
 */
function stubAnalysis(saved: Record<string, unknown> = { western: ANALYSIS_RESULT }): {
  analyzed: () => number;
} {
  let calls = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const body = url.includes("/api/mydate/systems")
        ? { ok: true, systems: [ANALYSIS_SYSTEM] }
        : url.includes("/api/mydate/analyze")
          ? ((calls += 1), { ok: true, result: ANALYSIS_RESULT })
          : { ok: true, systems: saved };
      return new Response(JSON.stringify(body), { status: 200 });
    }),
  );
  return { analyzed: () => calls };
}

/**
 * Адреса, на яку пішов блок: `pushState` тут не працює — це інший екран.
 * `location` підмінюється, тож оригінал зберігається: інакше наступний тест не
 * прочитав би `search` і вважав, що дати немає.
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

describe("DateAnalysisBlock: аналіз — це два кроки", () => {
  afterEach(() => {
    if (!savedLocation) return;
    Object.defineProperty(window, "location", savedLocation);
    savedLocation = undefined;
  });

  it("без `?sys=` показує крок вибору, а не готовий результат", async () => {
    window.history.replaceState({}, "", "/mydate/analysis?date=1980-03-03");
    stubAnalysis();
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(screen.getByText("Оберіть системи та параметри")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Аналізувати" })).toBeTruthy();
    expect(screen.queryByText("Риби")).toBeNull();
  });

  it("крок вибору лишає людину на екрані аналізу і несе вибір в адресу", async () => {
    window.history.replaceState({}, "", "/mydate/analysis?date=1980-03-03");
    stubAnalysis();
    const user = userEvent.setup();
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    const nav = captureNavigation();
    await user.click(screen.getByRole("button", { name: "Аналізувати" }));

    // Не `/mydate/compare/systems`: аналіз і співставлення — різні процеси.
    expect(nav.value()).toBe("/mydate/analysis?date=1980-03-03&sys=western&p=sunSign%2Celement");
  });

  it("результат показує трактування значення, а не саме лише слово", async () => {
    window.history.replaceState({}, "", "/mydate/analysis?date=1980-03-03&sys=western");
    stubAnalysis();
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(screen.getByText("Риби")).toBeTruthy();
    expect(screen.getByText("Розчинення меж і чутливість.")).toBeTruthy();
    expect(screen.getByText("Вплив радше відчувається.")).toBeTruthy();
  });

  it("`?p=` лишає тільки обрані параметри", async () => {
    window.history.replaceState({}, "", "/mydate/analysis?date=1980-03-03&sys=western&p=sunSign");
    stubAnalysis();
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(screen.getByText("Риби")).toBeTruthy();
    expect(screen.queryByText("Вода")).toBeNull();
  });

  it("обрана система без збереженого аналізу рахується одразу", async () => {
    window.history.replaceState({}, "", "/mydate/analysis?date=1980-03-03&sys=western");
    const api = stubAnalysis({});
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(api.analyzed()).toBe(1);
    expect(screen.getByText("Риби")).toBeTruthy();
  });

  it("невідома в адресі система не лишає порожній екран", async () => {
    window.history.replaceState({}, "", "/mydate/analysis?date=1980-03-03&sys=немає");
    stubAnalysis({});
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(screen.getByText("Немає систем, які можна показати.")).toBeTruthy();
  });
});
