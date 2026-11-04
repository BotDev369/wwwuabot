// @vitest-environment jsdom
/**
 * Панелі аналізів: два розрізи, їхні стани й те, що бачить людина.
 *
 * Перевіряємо не верстку, а твердження екрана: сума в підписі = сума рядків,
 * «інші» не гублять хвіст, а «день» справді перезапитує вікно. Мок стоїть на
 * транспорті, тож тест проходить і хук, і панель.
 * @module web-admin-dev/src/pages/spending/SpendingAnalytics.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { SpendingCodes, SpendingRecipients } from "@wwwuabot/shared/spending";

const api = vi.hoisted(() => ({
  fetchSpendingCodes: vi.fn(),
  fetchSpendingRecipients: vi.fn(),
}));

vi.mock("../../shared/api/spending.api", () => api);

const { SpendingAnalytics } = await import("./SpendingAnalytics");
const { SpendingBarChart } = await import("./SpendingBarChart");
const { SpendingCodesPanel } = await import("./SpendingCodesPanel");
const { SpendingRecipientsPanel } = await import("./SpendingRecipientsPanel");

function codes(): SpendingCodes {
  return {
    period: "2026-09",
    from: "2026-09-01",
    to: "2026-09-30",
    totals: { count: 12, amount: 5000 },
    kekv: [
      { code: "2111", count: 10, amount: 4000 },
      { code: "", count: 2, amount: 1000 },
    ],
    kpk: [{ code: "1010", count: 12, amount: 5000 }],
    budget: [],
  };
}

function recipients(): SpendingRecipients {
  return {
    scope: "month",
    from: "2026-09-01",
    to: "2026-09-30",
    bucket: "day",
    totals: { count: 12, amount: 1000, recipients: 5 },
    buckets: [
      { key: "2026-09-01", count: 4, amount: 400 },
      { key: "2026-09-02", count: 0, amount: 0 },
      { key: "2026-09-30", count: 8, amount: 600 },
    ],
    rows: [{ edrpou: "39894111", name: "ТОВ «Буд»", count: 12, amount: 300 }],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchSpendingCodes.mockResolvedValue(codes());
  api.fetchSpendingRecipients.mockResolvedValue(recipients());
});

describe("коди платежів", () => {
  it("називає підсумок і перемикає класифікацію", async () => {
    render(<SpendingCodesPanel period="2026-09" />);

    // Код є і в рейтингу, і в таблиці — беремо перший (рейтинг стоїть вище).
    expect((await screen.findAllByText("2111")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("без коду").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("tab", { name: "КПК" }));
    expect((await screen.findAllByText("1010")).length).toBeGreaterThan(0);
    expect(screen.queryByText("2111")).toBeNull();
  });

  it("порожній місяць — це відсутність платежів, а не нуль гривень", async () => {
    api.fetchSpendingCodes.mockResolvedValue({ ...codes(), totals: { count: 0, amount: 0 } });
    render(<SpendingCodesPanel period="2026-08" />);

    expect(await screen.findByText(/платежів у базі немає/)).toBeTruthy();
  });

  it("помилку показує текстом, а не порожньою таблицею", async () => {
    api.fetchSpendingCodes.mockRejectedValue(new Error("Є-data недоступна"));
    render(<SpendingCodesPanel period="2026-09" />);

    expect(await screen.findByText("Є-data недоступна")).toBeTruthy();
  });

  it("невідома помилка теж має людський текст", async () => {
    api.fetchSpendingCodes.mockRejectedValue("boom");
    render(<SpendingCodesPanel period="2026-09" />);

    expect(await screen.findByText("Не вдалось прочитати розріз за кодами")).toBeTruthy();
  });
});

describe("отримувачі", () => {
  it("показує вікно, ряд і згортає хвіст у «інші»", async () => {
    render(<SpendingRecipientsPanel />);

    expect(await screen.findByText("ТОВ «Буд»")).toBeTruthy();
    expect(screen.getByText("Інші")).toBeTruthy();
    expect(screen.getByText(/4 отримувачів/)).toBeTruthy();
    expect(screen.getByText(/^700,00/)).toBeTruthy();
    expect(screen.getAllByText(/01\.09|30\.09/).length).toBeGreaterThan(0);
  });

  it("«день» перезапитує вікно, а не фільтрує старе", async () => {
    render(<SpendingRecipientsPanel />);
    await screen.findByText("ТОВ «Буд»");

    fireEvent.click(screen.getByRole("tab", { name: "День" }));

    await waitFor(() => expect(api.fetchSpendingRecipients).toHaveBeenLastCalledWith("day"));
  });

  it("порожнє вікно й помилка не лишають таблицю мовчазною", async () => {
    api.fetchSpendingRecipients.mockResolvedValue({
      ...recipients(),
      totals: { count: 0, amount: 0, recipients: 0 },
      buckets: [],
      rows: [],
    });
    const view = render(<SpendingRecipientsPanel />);
    expect(await screen.findByText(/платежів у базі немає/)).toBeTruthy();
    view.unmount();

    api.fetchSpendingRecipients.mockRejectedValue(new Error("Є-data недоступна"));
    render(<SpendingRecipientsPanel />);
    expect(await screen.findByText("Є-data недоступна")).toBeTruthy();
  });
});

describe("діаграма", () => {
  it("порожній або нульовий ряд називає причину, а не малює вісь", () => {
    const empty = render(<SpendingBarChart points={[]} label={(key) => key} />);
    expect(screen.getByText(/Ряд порожній/)).toBeTruthy();
    empty.unmount();

    render(<SpendingBarChart points={[{ key: "2026-09-01", amount: 0 }]} label={(key) => key} />);
    expect(screen.getByText(/Ряд порожній/)).toBeTruthy();
  });

  it("стовпчик несе точне число у підписі", () => {
    render(
      <SpendingBarChart
        points={[
          { key: "2026-09-01", amount: 400 },
          { key: "2026-09-02", amount: 600 },
        ]}
        label={(key) => key.slice(8)}
      />,
    );

    expect(screen.getByText(/^01: 400/)).toBeTruthy();
    expect(screen.getByText(/^02: 600/)).toBeTruthy();
  });
});

describe("вкладки аналізів", () => {
  it("перемикає коди й отримувачів", async () => {
    render(<SpendingAnalytics period="2026-09" />);
    expect((await screen.findAllByText("2111")).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("tab", { name: "Отримувачі" }));
    expect(await screen.findByText("ТОВ «Буд»")).toBeTruthy();
  });
});
