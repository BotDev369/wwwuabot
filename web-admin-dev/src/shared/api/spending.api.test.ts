/**
 * Клієнт Є-data: адреса запиту й нічого більше.
 *
 * Перевіряється саме збирання `query`: порожній період чи курсор не мусять
 * ставати `?period=`, бо сервер прочитав би це як вибір, а «показати ще» без
 * курсора — як першу сторінку.
 * @module web-admin-dev/src/shared/api/spending.api.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock("./client", () => ({ apiFetch: client.apiFetch }));

const {
  fetchSpendingDocuments,
  fetchSpendingOverview,
  fetchSpendingSync,
  fetchSpendingTransactions,
} = await import("./spending.api");

beforeEach(() => {
  client.apiFetch.mockReset();
  client.apiFetch.mockResolvedValue({ items: [], nextCursor: null });
});

describe("огляд", () => {
  it("без періоду питає типовий", async () => {
    await fetchSpendingOverview();

    expect(client.apiFetch).toHaveBeenCalledWith("/api/admin/spending/overview");
  });

  it("з періодом додає його в адресу", async () => {
    await fetchSpendingOverview("2026-09");

    expect(client.apiFetch).toHaveBeenCalledWith("/api/admin/spending/overview?period=2026-09");
  });

  it("порожній період не стає параметром", async () => {
    await fetchSpendingOverview(null);

    expect(client.apiFetch).toHaveBeenCalledWith("/api/admin/spending/overview");
  });
});

describe("стан збору", () => {
  it("читає окремий шлях, а не огляд", async () => {
    await fetchSpendingSync("2026-09");

    expect(client.apiFetch).toHaveBeenCalledWith("/api/admin/spending/sync?period=2026-09");
  });
});

describe("договори", () => {
  it("ЄДРПОУ обов'язковий, решта — за наявністю", async () => {
    await fetchSpendingDocuments({ edrpou: "04360586", period: null, cursor: null, limit: 50 });

    expect(client.apiFetch).toHaveBeenCalledWith(
      "/api/admin/spending/documents?edrpou=04360586&limit=50",
    );
  });

  it("курсор іде в адресу, коли він є", async () => {
    await fetchSpendingDocuments({
      edrpou: "04360586",
      period: "2026-09",
      cursor: "2026-09-10|doc-1",
      limit: 50,
    });

    expect(client.apiFetch).toHaveBeenCalledWith(
      "/api/admin/spending/documents?edrpou=04360586&period=2026-09&cursor=2026-09-10%7Cdoc-1&limit=50",
    );
  });
});

describe("платежі", () => {
  it("роль їде параметром, а не окремим шляхом", async () => {
    await fetchSpendingTransactions({ edrpou: "43907812", role: "recipt", period: "2026-09" });

    expect(client.apiFetch).toHaveBeenCalledWith(
      "/api/admin/spending/transactions?edrpou=43907812&role=recipt&period=2026-09",
    );
  });
});
