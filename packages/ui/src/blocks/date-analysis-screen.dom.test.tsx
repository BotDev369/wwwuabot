// @vitest-environment jsdom
/**
 * Екран аналізу рендерить **досьє**, а не таблицю параметрів. Досьє рахується
 * лише після явного вибору систем; перевіряється те, що видно людині: вибір,
 * домени, рівень якорем, свідчення з джерелом і шаром, розбіжність обома
 * позиціями, чесне «не знаємо», стан опитування й подія без рис людини.
 *
 * @module packages/ui/src/blocks/date-analysis-screen.dom.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
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
  details: ["Дата: 1980-03-03", "Сонце в Овні, 13°02′ (12:00 UTC) — знак Овен"],
};

const DISCIPLINE = {
  ...INITIATIVE,
  qualityId: "discipline",
  level: 5,
  evidence: "Сонце в Овні: ритм тримає під зовнішньою вимогою",
};

const EMPATHY_WEST = {
  ...INITIATIVE,
  qualityId: "empathy",
  level: 4,
  evidence: "Сонце у Рибах: чує і те, що не сказано",
};

const EMPATHY_NUMBER = {
  ...INITIATIVE,
  qualityId: "empathy",
  level: 3,
  sourceId: "numerology",
  evidence: "Число життєвого шляху 6: помічає зміну настрою",
};

const DOSSIER = {
  date: "1980-03-03",
  kind: "person",
  symbol: "Овен",
  claims: [INITIATIVE, DISCIPLINE],
  systems: [
    {
      id: "western",
      name: "Західна астрологія",
      version: "2",
      about: "Тропічна астрологія читає положення Сонця.",
      gives: ["знак Сонця"],
      limits: ["Місяць — потрібен час народження"],
      source: "Птолемей, «Тетрабіблос»",
      parameters: [
        { label: "Знак Сонця", value: "Овен" },
        { label: "Градус Сонця", value: "13°02′ Овна (12:00 UTC)" },
      ],
    },
  ],
  note: null,
};

/** Заглушка API: досьє віддає саме те, що просив тест. */
function stubApi(dossiers: unknown[], survey: unknown = null): { calls: string[] } {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(`${String(url)} ${(init?.body as string) ?? ""}`);
      return new Response(JSON.stringify({ ok: true, dossiers, survey }), { status: 200 });
    }),
  );
  return { calls };
}

/** Виміряне свідчення: так його віддає сервер, зі своїм шаром і доказом. */
const MEASURED_DISCIPLINE = {
  qualityId: "discipline",
  level: 5,
  layer: "measured",
  sourceId: "bigfive",
  sourceVersion: "1",
  evidence: "Сумлінність — 18 з 20",
  method: "mapped",
  temporal: "trait",
  confidence: 0.5,
};

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

describe("DateAnalysisBlock — вибір систем", () => {
  it("без вибору не робить запит і не показує досьє", async () => {
    openAt("?dates=1980-03-03");
    const api = stubApi([DOSSIER]);
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(screen.getByText("Системи аналізу")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Порахувати портрет" }).hasAttribute("disabled"),
    ).toBe(true);
    expect(api.calls).toHaveLength(0);
    expect(screen.queryByText("Не знаємо")).toBeNull();
    expect(screen.queryByText(/мають свідчення/)).toBeNull();
  });

  it("вибір системи рахує досьє і лишає вибір в адресі", async () => {
    openAt("?dates=1980-03-03");
    const api = stubApi([DOSSIER]);
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    fireEvent.click(screen.getByLabelText(/Західна астрологія/));
    fireEvent.click(screen.getByRole("button", { name: "Порахувати портрет" }));
    await settle();

    expect(api.calls).toHaveLength(1);
    expect(api.calls[0]).toContain("/api/mydate/dossier");
    expect(api.calls[0]).toContain('"lenses":["western"]');
    expect(window.location.search).toContain("lenses=western");
    expect(screen.getByRole("heading", { level: 3, name: "3.03.1980" })).toBeTruthy();
    expect(screen.getByText("2 з 36 якостей уже видно")).toBeTruthy();
  });
});

describe("DateAnalysisBlock — досьє", () => {
  it("малює домени й рівень якорем, а не таблицею параметрів", async () => {
    openAt("?dates=1980-03-03&lenses=western");
    const api = stubApi([DOSSIER]);
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(screen.getByRole("heading", { level: 2, name: "Портрет:" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 4, name: /Воля/ })).toBeTruthy();
    expect(screen.getAllByText("Ініціатива").length).toBeGreaterThan(0);
    // Рівень показаний підписом смуги й поведінковим якорем, а не числом.
    expect(screen.getAllByText("Високий").length).toBeGreaterThan(0);
    expect(screen.getByText(/початок без дозволу/)).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    // Один запит на екран: ані матриці, ані вибору систем після вибору.
    expect(api.calls).toHaveLength(1);
    expect(api.calls[0]).toContain("/api/mydate/dossier");
    expect(api.calls[0]).toContain("1980-03-03");
  });

  it("свідчення розкривають джерело, шар і впевненість", async () => {
    openAt("?dates=1980-03-03&lenses=western");
    stubApi([DOSSIER]);
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(screen.getAllByText("Західна астрологія").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Традиція").length).toBeGreaterThan(0);
    expect(screen.getByText(/Сонце в Овні: початок без дозволу/)).toBeTruthy();
    expect(screen.getAllByText(/Наскільки це певно: низько/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Скільки систем назвали кожен рівень").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Як ми це визначили").length).toBeGreaterThan(0);
  });

  it("розбіжність показує обидві позиції, а не середнє", async () => {
    openAt("?dates=1980-03-03&lenses=western,numerology");
    stubApi([{ ...DOSSIER, claims: [EMPATHY_WEST, EMPATHY_NUMBER] }]);
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(screen.getByText("Системи не згодні")).toBeTruthy();
    expect(screen.getByText(/Західна астрологія — Високий/)).toBeTruthy();
    expect(screen.getByText(/Нумерологія — Середній/)).toBeTruthy();
    expect(screen.getByText(/Різні системи читають дату по-своєму/)).toBeTruthy();
    // Якір є в кожного свідчення, навіть коли вони розходяться.
    expect(screen.getByText("Підбирає слова під стан іншого без нагадування.")).toBeTruthy();
    expect(screen.getByText("Помічає зміну настрою й питає.")).toBeTruthy();
  });

  it("якості без свідчень кажуть «не знаємо», а не показують середину", async () => {
    openAt("?dates=1980-03-03&lenses=western");
    stubApi([DOSSIER]);
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    // 36 якостей, свідчення мають дві — решта чесно невідома.
    expect(screen.getAllByText("Не знаємо")).toHaveLength(34);
    expect(screen.queryByText("Середній")).toBeNull();
  });

  it("опитування — це вибір: без згоди виміряне не приїжджає", async () => {
    openAt("?dates=1980-03-03&lenses=western");
    // Сервер без згоди не віддає виміряного — і екран не має його вигадувати.
    const api = stubApi([DOSSIER], null);
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(screen.getByText("Опитування")).toBeTruthy();
    expect(screen.getByText("не додано")).toBeTruthy();
    expect((screen.getByLabelText(/Додати мої відповіді/) as HTMLInputElement).checked).toBe(false);
    expect(screen.getByRole("link", { name: /Пройти тести/ }).getAttribute("href")).toBe(
      "/assessments",
    );
    // Запит був, але без згоди: сервер не має віддавати відповіді людини.
    expect(api.calls[0]).toContain('"survey":false');
    expect(screen.queryByText(/мають вимір/)).toBeNull();
  });

  it("згода додає виміряні якості окремим блоком, не змішуючи шари", async () => {
    openAt("?dates=1980-03-03&lenses=western&survey=1");
    const api = stubApi([DOSSIER], {
      measuredAt: "2026-11-19",
      claims: [MEASURED_DISCIPLINE],
    });
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(api.calls[0]).toContain('"survey":true');
    expect(screen.getByText(/Опитування: Велика п'ятірка/)).toBeTruthy();
    expect(screen.getByText("1 з 36 якостей видно з відповідей")).toBeTruthy();
    expect(screen.getByText("Сумлінність — 18 з 20")).toBeTruthy();
    expect(screen.getByText(/не підвищує впевненості/)).toBeTruthy();
  });

  it("згода без жодного проходження каже це прямо й веде до тестів", async () => {
    openAt("?dates=1980-03-03&lenses=western&survey=1");
    stubApi([DOSSIER], null);
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(screen.getByText("ще немає")).toBeTruthy();
    expect(screen.getByText(/Ви ще не проходили опитування/)).toBeTruthy();
    expect(screen.queryByText(/видно з відповідей/)).toBeNull();
  });

  it("кілька дат — кілька досьє з власними підписами", async () => {
    openAt("?dates=1980-03-03,1990-05-05&labels=Мама|Я&lenses=western");
    stubApi([DOSSIER, { ...DOSSIER, date: "1990-05-05", claims: [INITIATIVE] }]);
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(screen.getByRole("heading", { level: 3, name: "Мама" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Я" })).toBeTruthy();
    expect(screen.getAllByText(/3\.03\.1980/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/5\.05\.1990/).length).toBeGreaterThan(0);
  });

  it("себе показує «Ваше досьє»", async () => {
    openAt("?dates=1980-03-03&self=1&lenses=western");
    stubApi([DOSSIER]);
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(screen.getByRole("heading", { level: 2, name: "Ваш портрет:" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Ви" })).toBeTruthy();
  });

  it("подія не прикидається людиною: лише символ дня й чесний стан", async () => {
    openAt("?dates=1980-03-03&kind=event&lenses=western");
    stubApi([{ ...DOSSIER, kind: "event", claims: [], note: "event-not-modelled" }]);
    render(<DateAnalysisBlock {...props()} />);
    await settle();

    expect(screen.getByRole("heading", { level: 3, name: "Подія" })).toBeTruthy();
    expect(screen.getByText(/Якостей події ми ще не описуємо/)).toBeTruthy();
    expect(screen.queryByText("Не знаємо")).toBeNull();
    expect(screen.queryByText(/мають свідчення/)).toBeNull();
  });

  it("помилку сервера видно, і вона не лишає порожніх доменів", async () => {
    openAt("?dates=1980-03-03&lenses=western");
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
