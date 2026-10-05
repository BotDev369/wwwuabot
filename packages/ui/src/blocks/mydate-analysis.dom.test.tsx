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
