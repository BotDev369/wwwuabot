/**
 * Шляхи Є-data: кожна адреса веде у свій контролер, а чужа лишається сусідові.
 *
 * Читання — тільки `GET`: збір даних іде розкладом, і `POST` на цих адресах
 * означав би ручний запуск, якого на цьому етапі немає.
 *
 * @module api-dev/src/routes/spending.test
 */

import { describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";

const handlers = {
  handleSpendingOverview: vi.fn(),
  handleSpendingSync: vi.fn(),
  handleSpendingDocuments: vi.fn(),
  handleSpendingTransactions: vi.fn(),
};

vi.mock("../controllers/spending-admin.controller", () => ({
  handleSpendingOverview: handlers.handleSpendingOverview,
  handleSpendingSync: handlers.handleSpendingSync,
  handleSpendingDocuments: handlers.handleSpendingDocuments,
  handleSpendingTransactions: handlers.handleSpendingTransactions,
}));

const { matchSpendingRoute } = await import("./spending");

const ENV = {} as Env;
const request = (method: string, path: string): Request =>
  new Request(`https://api.test${path}`, { method });

describe("читання Є-data", () => {
  it("огляд, стан, договори й платежі ведуть кожен у свій контролер", async () => {
    for (const handler of Object.values(handlers)) handler.mockReturnValue(new Response("ok"));

    for (const [path, handler] of [
      ["/api/admin/spending/overview", handlers.handleSpendingOverview],
      ["/api/admin/spending/sync", handlers.handleSpendingSync],
      ["/api/admin/spending/documents", handlers.handleSpendingDocuments],
      ["/api/admin/spending/transactions", handlers.handleSpendingTransactions],
    ] as const) {
      const req = request("GET", path);
      const response = await matchSpendingRoute(req, ENV, path);
      expect(await (response as Response).text()).toBe("ok");
      expect(handler).toHaveBeenCalledWith(req, ENV);
    }
  });

  it("⛔ запису тут немає: POST на ту саму адресу — не наш шлях", () => {
    expect(
      matchSpendingRoute(
        request("POST", "/api/admin/spending/sync"),
        ENV,
        "/api/admin/spending/sync",
      ),
    ).toBeNull();
  });
});

describe("чужий шлях", () => {
  it("адреса поза доменом лишається сусідньому модулю", () => {
    expect(
      matchSpendingRoute(request("GET", "/api/admin/events"), ENV, "/api/admin/events"),
    ).toBeNull();
  });

  it("вкладена адреса без обробника не стає мовчазним 200", () => {
    expect(
      matchSpendingRoute(
        request("GET", "/api/admin/spending/cards"),
        ENV,
        "/api/admin/spending/cards",
      ),
    ).toBeNull();
  });
});
