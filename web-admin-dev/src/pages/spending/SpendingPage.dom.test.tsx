// @vitest-environment jsdom
/**
 * Сторінка Є-data: її стани й те, що вона каже про порожнечу.
 *
 * Мок стоїть на транспорті (`spending.api`), а не на хуках: тоді тест
 * проходить і `useSpending`, і `useSpendingList` — саме вони тримають
 * поведінку, і саме їх ламає правка (AGENTS.md §8, прогалина в тестах хука).
 * @module web-admin-dev/src/pages/spending/SpendingPage.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { SpendingOverview, SpendingSyncRow } from "@wwwuabot/shared/spending";

const api = vi.hoisted(() => ({
  fetchSpendingOverview: vi.fn(),
  fetchSpendingDocuments: vi.fn(),
  fetchSpendingTransactions: vi.fn(),
}));

vi.mock("../../shared/api/spending.api", () => api);

const { SpendingPage } = await import("./SpendingPage");

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

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchSpendingOverview.mockResolvedValue(overview());
  api.fetchSpendingDocuments.mockResolvedValue({ items: [], nextCursor: null });
  api.fetchSpendingTransactions.mockResolvedValue({ items: [], nextCursor: null });
});

describe("зібрані дані", () => {
  it("показує розпорядника й називає нуль «не оприлюднено»", async () => {
    const view = render(<SpendingPage />);

    expect(await screen.findByText("Бучанська міська рада")).toBeTruthy();
    expect(screen.getByText("не оприлюднено")).toBeTruthy();
    expect(screen.getByText("зібрано")).toBeTruthy();
    view.unmount();
  });

  it("⛔ не малює «всього громади»: сторони платежу не додаються", async () => {
    const view = render(<SpendingPage />);
    await screen.findByText("Бучанська міська рада");

    expect(screen.queryByText(/^всього/i)).toBeNull();
    expect(screen.getByText(/дві сторони тих самих платежів/)).toBeTruthy();
    view.unmount();
  });

  it("клік по розпоряднику відкриває договори, а вкладка — платежі", async () => {
    const view = render(<SpendingPage />);

    fireEvent.click(await screen.findByText("Бучанська міська рада"));
    expect(await screen.findByRole("heading", { name: "Бучанська міська рада" })).toBeTruthy();
    expect(await screen.findByText(/Договорів за цей період немає/)).toBeTruthy();
    expect(api.fetchSpendingDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ edrpou: "04360586", period: "2026-09" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Сплати" }));
    await waitFor(() =>
      expect(api.fetchSpendingTransactions).toHaveBeenCalledWith(
        expect.objectContaining({ role: "payer" }),
      ),
    );
    view.unmount();
  });
});

describe("порожній період", () => {
  it("каже, що збору ще не було, і показує кроки", async () => {
    api.fetchSpendingOverview.mockResolvedValue({
      ...overview(),
      period: null,
      from: null,
      to: null,
      capturedAt: null,
      orgs: [],
      sync: [],
    });

    const view = render(<SpendingPage />);

    expect(await screen.findByText(/Зібраних даних ще немає/)).toBeTruthy();
    expect(screen.getByText(/Кроків збору ще немає/)).toBeTruthy();
    view.unmount();
  });
});

describe("помилка", () => {
  it("показує причину й дає повторити", async () => {
    api.fetchSpendingOverview.mockRejectedValueOnce(new Error("KV недоступний"));

    const view = render(<SpendingPage />);

    expect(await screen.findByText(/KV недоступний/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Спробувати ще/ }));

    await waitFor(() => expect(api.fetchSpendingOverview).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Бучанська міська рада")).toBeTruthy();
    view.unmount();
  });
});
