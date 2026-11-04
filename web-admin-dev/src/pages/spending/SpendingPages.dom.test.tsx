// @vitest-environment jsdom
/**
 * Є-data: хаб і підсторінки — те, що видно людині й те, що вона не має бачити.
 *
 * Мок стоїть на транспорті (`spending.api`), а не на хуках: тоді тест проходить
 * `useSpending` і `useSpendingList` — саме вони тримають поведінку завантаження
 * й пагінації, і саме їх ламає правка.
 * @module web-admin-dev/src/pages/spending/SpendingPages.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import type { SpendingOverview, SpendingSyncRow } from "@wwwuabot/shared/spending";

const api = vi.hoisted(() => ({
  fetchSpendingOverview: vi.fn(),
  fetchSpendingDocuments: vi.fn(),
  fetchSpendingTransactions: vi.fn(),
  fetchSpendingCodes: vi.fn(),
  fetchSpendingRecipients: vi.fn(),
  refreshSpending: vi.fn(),
}));

vi.mock("../../shared/api/spending.api", () => api);

const { SpendingHubPage } = await import("./SpendingHubPage");
const { SpendingOrgsPage } = await import("./SpendingOrgsPage");
const { SpendingPaymentsPage } = await import("./SpendingPaymentsPage");
const { SpendingCodesPage } = await import("./SpendingCodesPage");
const { SpendingRecipientsPage } = await import("./SpendingRecipientsPage");
const { SpendingSyncPage } = await import("./SpendingSyncPage");

function renderPage(page: ReactElement) {
  return render(<MemoryRouter initialEntries={["/spending"]}>{page}</MemoryRouter>);
}

const SYNC: SpendingSyncRow = {
  key: "payments:2026-09",
  kind: "payments",
  period: "2026-09",
  status: "ok",
  rows: 649,
  startedAt: "2026-10-01T05:37:00.000Z",
  finishedAt: "2026-10-01T05:38:00.000Z",
  error: "",
};

function overview(): SpendingOverview {
  return {
    period: "2026-09",
    from: "2026-09-01",
    to: "2026-09-30",
    capturedAt: "2026-10-01T05:38:00.000Z",
    lastLoad: { fetchedAt: "2026-10-01T05:00:00.000Z", raw: { organizations: [] } },
    orgs: [
      {
        edrpou: "04360586",
        name: "Бучанська міська рада",
        form: "Орган місцевого самоврядування",
        koatuu: "3210800000",
        documents: { count: 2, amount: 1500.5 },
        payments: { count: 3, amount: 900 },
        receipts: { count: 0, amount: 0 },
      },
    ],
    sync: [SYNC],
  };
}

const PAYMENT = {
  id: "tx-1",
  payerEdrpou: "04360586",
  payerName: "Бучанська міська рада",
  reciptEdrpou: "39894111",
  reciptName: "ТОВ Будівельник",
  transDate: "2026-09-10",
  amount: 900,
  currency: "UAH",
  paymentDetails: "Ремонт дороги",
  kekv: "2111",
  kpk: "1010",
  budgetCode: "",
  contractId: "",
  contractNumber: "",
  sourceName: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchSpendingOverview.mockResolvedValue(overview());
  api.fetchSpendingDocuments.mockResolvedValue({ items: [], nextCursor: null });
  api.fetchSpendingTransactions.mockResolvedValue({ items: [PAYMENT], nextCursor: null });
  api.fetchSpendingCodes.mockResolvedValue({
    period: "2026-09",
    from: "2026-09-01",
    to: "2026-09-30",
    totals: { count: 3, amount: 900 },
    kekv: [{ code: "2111", count: 3, amount: 900 }],
    kpk: [],
    budget: [],
  });
  api.refreshSpending.mockResolvedValue({ report: { stopped: null } });
  api.fetchSpendingRecipients.mockResolvedValue({
    scope: "month",
    from: "2026-09-01",
    to: "2026-09-30",
    bucket: "day",
    totals: { count: 3, amount: 900, recipients: 1 },
    buckets: [{ key: "2026-09-10", count: 3, amount: 900 }],
    rows: [{ edrpou: "39894111", name: "ТОВ Будівельник", count: 3, amount: 900 }],
  });
});

describe("хаб", () => {
  it("показує можливість, число періоду й картки зі сторінками", async () => {
    const view = renderPage(<SpendingHubPage />);

    expect(await screen.findByText("Видатки громади з Є-data")).toBeTruthy();
    expect(screen.getByText("Сплачено")).toBeTruthy();
    expect(screen.getByText("900 ₴")).toBeTruthy();
    const link = screen.getByRole("link", { name: /Платежі/ });
    expect(link.getAttribute("href")).toBe("/spending/payments?period=2026-09");
    view.unmount();
  });

  it("⛔ необіцяне позначене «скоро» й нікуди не веде", async () => {
    const view = renderPage(<SpendingHubPage />);
    await screen.findByText("Видатки громади з Є-data");

    const soon = screen.getAllByText("скоро");
    expect(soon.length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /Бюджет і факт/ })).toBeNull();
    expect(screen.getByText("Бюджет і факт")).toBeTruthy();
    view.unmount();
  });

  it("порожній період веде до стану збору, а не показує нулі", async () => {
    api.fetchSpendingOverview.mockResolvedValue({
      ...overview(),
      period: null,
      from: null,
      to: null,
      capturedAt: null,
      orgs: [],
      sync: [],
    });

    const view = renderPage(<SpendingHubPage />);

    expect(await screen.findByText("Зібраних даних ще немає")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Стан збору" }).getAttribute("href")).toBe(
      "/spending/sync",
    );
    view.unmount();
  });

  it("помилку показує й дає повторити", async () => {
    api.fetchSpendingOverview.mockRejectedValueOnce(new Error("KV недоступний"));

    const view = renderPage(<SpendingHubPage />);

    expect(await screen.findByText(/KV недоступний/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Спробувати ще/ }));
    await waitFor(() => expect(api.fetchSpendingOverview).toHaveBeenCalledTimes(2));
    view.unmount();
  });
});

describe("розпорядники", () => {
  it("показує назву, нуль «не оприлюднено» і деталі по кліку", async () => {
    const view = renderPage(<SpendingOrgsPage />);

    expect(await screen.findByText("Бучанська міська рада")).toBeTruthy();
    expect(screen.getByText("не оприлюднено")).toBeTruthy();

    fireEvent.click(screen.getByText("Бучанська міська рада"));
    expect(await screen.findByText(/Договорів за цей період немає/)).toBeTruthy();
    expect(api.fetchSpendingDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ edrpou: "04360586", period: "2026-09" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Сплати" }));
    expect(await screen.findByText("Ремонт дороги")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Надходження" }));
    await waitFor(() =>
      expect(api.fetchSpendingTransactions).toHaveBeenCalledWith(
        expect.objectContaining({ role: "recipt" }),
      ),
    );
    view.unmount();
  });
});

describe("платежі", () => {
  it("читає громаду без ЄДРПОУ і показує отримувача з призначенням", async () => {
    const view = renderPage(<SpendingPaymentsPage />);

    expect(await screen.findByText("ТОВ Будівельник")).toBeTruthy();
    expect(screen.getByText("Ремонт дороги")).toBeTruthy();
    expect(api.fetchSpendingTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ edrpou: null, role: "payer", period: "2026-09" }),
    );
    view.unmount();
  });

  it("дописує наступну сторінку за курсором", async () => {
    api.fetchSpendingTransactions
      .mockResolvedValueOnce({ items: [PAYMENT], nextCursor: "next" })
      .mockResolvedValueOnce({ items: [{ ...PAYMENT, id: "tx-2" }], nextCursor: null });

    const view = renderPage(<SpendingPaymentsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Показати ще" }));

    await waitFor(() =>
      expect(api.fetchSpendingTransactions).toHaveBeenLastCalledWith(
        expect.objectContaining({ cursor: "next" }),
      ),
    );
    view.unmount();
  });
});

describe("коди, отримувачі, стан збору", () => {
  it("коди показують КЕКВ за вибраний місяць", async () => {
    const view = renderPage(<SpendingCodesPage />);

    expect((await screen.findAllByText("2111")).length).toBeGreaterThan(0);
    expect(api.fetchSpendingCodes).toHaveBeenCalledWith("2026-09");
    view.unmount();
  });

  it("коди: місяць обирається в шапці, а «Зібрати зараз» перечитує його", async () => {
    api.fetchSpendingOverview.mockResolvedValue({
      ...overview(),
      sync: [SYNC, { ...SYNC, key: "payments:2026-10", period: "2026-10" }],
    });

    const view = renderPage(<SpendingCodesPage />);
    const select = await screen.findByLabelText("Період");
    fireEvent.change(select, { target: { value: "2026-10" } });
    await waitFor(() => expect(api.fetchSpendingOverview).toHaveBeenCalledWith("2026-10"));

    fireEvent.click(screen.getByRole("button", { name: /Зібрати зараз/ }));
    await waitFor(() => expect(api.refreshSpending).toHaveBeenCalled());
    view.unmount();
  });

  it("порожній період на сторінці кодів каже, де шукати причину", async () => {
    api.fetchSpendingOverview.mockResolvedValue({
      ...overview(),
      period: null,
      from: null,
      to: null,
      capturedAt: null,
      orgs: [],
      sync: [],
    });

    const view = renderPage(<SpendingCodesPage />);
    expect(await screen.findByText(/За цей період даних немає/)).toBeTruthy();
    view.unmount();
  });

  it("отримувачі показують топ за сумою", async () => {
    const view = renderPage(<SpendingRecipientsPage />);

    expect(await screen.findByText("ТОВ Будівельник")).toBeTruthy();
    view.unmount();
  });

  it("помилку огляду показують і коди, і стан збору", async () => {
    api.fetchSpendingOverview.mockRejectedValueOnce(new Error("D1 недоступна"));
    const codes = renderPage(<SpendingCodesPage />);
    expect(await screen.findByText(/D1 недоступна/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Спробувати ще/ }));
    await waitFor(() => expect(api.fetchSpendingOverview).toHaveBeenCalledTimes(2));
    codes.unmount();

    api.fetchSpendingOverview.mockClear();
    api.fetchSpendingOverview.mockRejectedValueOnce(new Error("D1 недоступна"));
    const sync = renderPage(<SpendingSyncPage />);
    expect(await screen.findByText(/D1 недоступна/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Спробувати ще/ }));
    await waitFor(() => expect(api.fetchSpendingOverview).toHaveBeenCalledTimes(2));
    sync.unmount();
  });

  it("стан збору показує кроки, а не ключі бази", async () => {
    const view = renderPage(<SpendingSyncPage />);

    expect(await screen.findByText("пачка платежів")).toBeTruthy();
    expect(screen.queryByText(/payments:2026-09/)).toBeNull();
    view.unmount();
  });
});
