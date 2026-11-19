// @vitest-environment jsdom
/**
 * Екран аналізу рендерить **досьє**, а не таблицю параметрів.
 *
 * Перевіряється те, що видно людині: домени, рівень якорем, свідчення з
 * джерелом і шаром, чесне «не знаємо», стан опитування й подія, яка не
 * прикидається людиною.
 *
 * @module packages/ui/src/blocks/date-analysis-screen.dom.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { DateAnalysisBlock } from "./DateAnalysisBlock";

function props(over: Record<string, unknown> = {}): BlockComponentProps {
  return {
    block: { id: "b1", type: "date-analysis", order: 0, props: over },
    zone: "main",
    context: {} as BlockComponentProps["context"],
  };
}

const INITIATIVE = {
  qualityId: "initiative",
  level: 4,
  layer: "symbolic",
  sourceId: "western",
  sourceVersion: "1",
  evidence: "Сонце в Овні: початок без дозволу",
  method: "mapped",
  temporal: "trait",
  confidence: 0.16,
};

const DISCIPLINE = {
  ...INITIATIVE,
  qualityId: "discipline",
  level: 5,
  evidence: "Сонце в Овні: ритм тримає під зовнішньою вимогою",
};

const DOSSIER = {
  date: "1980-03-03",
  kind: "person",
  symbol: "Овен",
  claims: [INITIATIVE, DISCIPLINE],
  note: null,
};

/** Заглушка API: досьє віддає саме те, що просив тест. */
function stubApi(dossiers: unknown[]): { calls: string[] } {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(`${String(url)} ${(init?.body as string) ?? ""}`);
      return new Response(JSON.stringify({ ok: true, dossiers }), { status: 200 });
    }),
  );
  return { calls };
}

/** Дочекатися, поки запит з `useEffect` відпрацює. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

let savedLocation: PropertyDescriptor | undefined;

beforeEach(() => {
  savedLocation ??= Object.getOwnPropertyDescriptor(window, "location");
});

afterEach(async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  vi.unstubAllGlobals();
  if (!savedLocation) return;
  Object.defineProperty(window, "location", savedLocation);
  savedLocation = undefined;
});

function openAt(search: string): void {
  window.history.replaceState({}, "", `/dateanalysis/analysis${search}`);
}

describe("DateAnalysisBlock — без дат", () => {
  it("каже, що дат немає, і дає шлях до їхнього списку", () => {
    openAt("");
    render(<DateAnalysisBlock {...props({ backUrl: "/dateanalysis" })} />);
    expect(screen.getByText("Немає суб'єктів для аналізу.")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Обрати, кого аналізувати" }).getAttribute("href"),
    ).toBe("/dateanalysis");
    expect(screen.queryByRole("table")).toBeNull();
  });
});

describe("DateAnalysisBlock — досьє", () => {
  it("малює домени й рівень якорем, а не таблицею параметрів", async () => {
    openAt("?dates=1980-03-03");
    const api = stubApi([DOSSIER]);
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(screen.getByRole("heading", { level: 2, name: "Досьє:" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 4, name: /Воля/ })).toBeTruthy();
    expect(screen.getAllByText("Ініціатива").length).toBeGreaterThan(0);
    // Рівень показаний підписом смуги й поведінковим якорем, а не числом.
    expect(screen.getAllByText("Високий").length).toBeGreaterThan(0);
    expect(screen.getByText(/початок без дозволу/)).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    // Один запит на екран: ані матриці, ані вибору систем.
    expect(api.calls).toHaveLength(1);
    expect(api.calls[0]).toContain("/api/mydate/dossier");
    expect(api.calls[0]).toContain("1980-03-03");
  });

  it("свідчення розкривають джерело, шар і впевненість", async () => {
    openAt("?dates=1980-03-03");
    stubApi([DOSSIER]);
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(screen.getAllByText("Західна астрологія").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Символічне").length).toBeGreaterThan(0);
    expect(screen.getByText(/Сонце в Овні: початок без дозволу/)).toBeTruthy();
    expect(screen.getAllByText(/Впевненість: низька/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Свідчення за рівнями 1–5").length).toBeGreaterThan(0);
  });

  it("якості без свідчень кажуть «не знаємо», а не показують середину", async () => {
    openAt("?dates=1980-03-03");
    stubApi([DOSSIER]);
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    // 36 якостей, свідчення мають дві — решта чесно невідома.
    expect(screen.getAllByText("Не знаємо")).toHaveLength(34);
    expect(screen.queryByText("Середній")).toBeNull();
  });

  it("опитування стоїть на тому ж екрані як «ще не виміряно» з переходом до тестів", async () => {
    openAt("?dates=1980-03-03");
    stubApi([DOSSIER]);
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(screen.getByText("Опитування")).toBeTruthy();
    expect(screen.getByText("ще не виміряно")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Пройти тести/ }).getAttribute("href")).toBe(
      "/assessments",
    );
  });

  it("кілька дат — кілька досьє з власними підписами", async () => {
    openAt("?dates=1980-03-03,1990-05-05&labels=Мама|Я");
    stubApi([DOSSIER, { ...DOSSIER, date: "1990-05-05", claims: [INITIATIVE] }]);
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(screen.getByRole("heading", { level: 3, name: "Мама" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Я" })).toBeTruthy();
    expect(screen.getAllByText(/3\.03\.1980/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/5\.05\.1990/).length).toBeGreaterThan(0);
  });

  it("себе показує «Ваше досьє»", async () => {
    openAt("?dates=1980-03-03&self=1");
    stubApi([DOSSIER]);
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(screen.getByRole("heading", { level: 2, name: "Ваше досьє:" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Ви" })).toBeTruthy();
  });

  it("подія не прикидається людиною: лише символ дня й чесний стан", async () => {
    openAt("?dates=1980-03-03&kind=event");
    stubApi([{ ...DOSSIER, kind: "event", claims: [], note: "event-not-modelled" }]);
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(screen.getByRole("heading", { level: 3, name: "Подія" })).toBeTruthy();
    expect(screen.getByText(/Якісного профілю події ядро ще не описує/)).toBeTruthy();
    expect(screen.queryByText("Не знаємо")).toBeNull();
    expect(screen.queryByText(/мають свідчення/)).toBeNull();
  });

  it("помилку сервера видно, і вона не лишає порожніх доменів", async () => {
    openAt("?dates=1980-03-03");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ ok: false, error: "Немає доступу" }), { status: 200 }),
      ),
    );
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(screen.getByText("Немає доступу")).toBeTruthy();
    expect(screen.queryByText("Не знаємо")).toBeNull();
  });
});
