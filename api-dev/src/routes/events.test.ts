/**
 * Шляхи журналу: кожна адреса веде в свій контролер, а чужа лишається
 * сусідньому модулю.
 *
 * Прибирання — `POST`, і саме це тут перевіряється: `DELETE` на тій самій
 * адресі читався б як «видали одну подію», тож метод мусить бути частиною
 * адреси, а не побажанням клієнта.
 *
 * @module api-dev/src/routes/events.test
 */

import { describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";

const handlers = {
  handleEventSummary: vi.fn(),
  handleEventList: vi.fn(),
  handleEventUsers: vi.fn(),
  handleEventCleanup: vi.fn(),
  handleEventSettingsRead: vi.fn(),
  handleEventSettingsWrite: vi.fn(),
};

vi.mock("../controllers/events.controller", () => ({
  handleEventSummary: handlers.handleEventSummary,
  handleEventList: handlers.handleEventList,
  handleEventUsers: handlers.handleEventUsers,
  handleEventCleanup: handlers.handleEventCleanup,
  handleEventSettingsRead: handlers.handleEventSettingsRead,
  handleEventSettingsWrite: handlers.handleEventSettingsWrite,
}));

const { matchEventsRoute } = await import("./events");

const ENV = {} as Env;
const request = (method: string, path: string): Request =>
  new Request(`https://api.test${path}`, { method });

describe("читання журналу", () => {
  it("зведення, люди й список ведуть кожен у свій контролер", async () => {
    for (const handler of Object.values(handlers)) handler.mockReturnValue(new Response("ok"));
    const summary = request("GET", "/api/admin/events/summary");

    await matchEventsRoute(summary, ENV, "/api/admin/events/summary");
    expect(handlers.handleEventSummary).toHaveBeenCalledWith(summary, ENV);

    await matchEventsRoute(
      request("GET", "/api/admin/events/users"),
      ENV,
      "/api/admin/events/users",
    );
    expect(handlers.handleEventUsers).toHaveBeenCalledTimes(1);

    await matchEventsRoute(request("GET", "/api/admin/events"), ENV, "/api/admin/events");
    expect(handlers.handleEventList).toHaveBeenCalledTimes(1);
  });

  it("люди — лише GET", () => {
    expect(
      matchEventsRoute(request("POST", "/api/admin/events/users"), ENV, "/api/admin/events/users"),
    ).toBeNull();
  });
});

describe("налаштування журналу", () => {
  it("читання й запис живуть на одній адресі, розрізняє метод", async () => {
    for (const handler of Object.values(handlers)) handler.mockReturnValue(new Response("ok"));

    await matchEventsRoute(
      request("GET", "/api/admin/events/settings"),
      ENV,
      "/api/admin/events/settings",
    );
    expect(handlers.handleEventSettingsRead).toHaveBeenCalledTimes(1);

    await matchEventsRoute(
      request("POST", "/api/admin/events/settings"),
      ENV,
      "/api/admin/events/settings",
    );
    expect(handlers.handleEventSettingsWrite).toHaveBeenCalledTimes(1);
  });
});

describe("прибирання", () => {
  it("приймає POST і отримує саме цей запит", async () => {
    handlers.handleEventCleanup.mockReturnValue(new Response("clean"));
    const req = request("POST", "/api/admin/events/delete");

    const response = await matchEventsRoute(req, ENV, "/api/admin/events/delete");

    expect(await (response as Response).text()).toBe("clean");
    expect(handlers.handleEventCleanup).toHaveBeenCalledWith(req, ENV);
  });

  it("DELETE на тій самій адресі не вважається прибиранням", () => {
    expect(
      matchEventsRoute(
        request("DELETE", "/api/admin/events/delete"),
        ENV,
        "/api/admin/events/delete",
      ),
    ).toBeNull();
  });
});

describe("чужий шлях", () => {
  it("не-журнальна адреса лишається сусідньому модулю", () => {
    expect(
      matchEventsRoute(request("GET", "/api/admin/users"), ENV, "/api/admin/users"),
    ).toBeNull();
  });
});
