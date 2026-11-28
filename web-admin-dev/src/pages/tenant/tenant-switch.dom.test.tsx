// @vitest-environment jsdom
/**
 * Проєкт, вибраний на одному екрані, діє на іншому — без повторного вибору.
 *
 * @module web-admin-dev/src/pages/tenant/tenant-switch.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const content = vi.hoisted(() => ({
  listScenarios: vi.fn(),
  readScenario: vi.fn(),
  updateScenario: vi.fn(),
  createScenario: vi.fn(),
  listPages: vi.fn(),
  readPage: vi.fn(),
  reindex: vi.fn(),
}));
vi.mock("../../shared/api/scenarios-admin.api", () => ({
  listBotScenarios: content.listScenarios,
  readBotScenario: content.readScenario,
  updateBotScenario: content.updateScenario,
  createBotScenario: content.createScenario,
  listPlatformPages: content.listPages,
  readPlatformPage: content.readPage,
  reindexSearch: content.reindex,
}));

const tenantsApi = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("../../shared/api/tenants.api", () => ({
  listActiveTenants: tenantsApi.list,
  listAdminTenants: tenantsApi.list,
}));

const { BotScenariosPage } = await import("../bot/BotScenariosPage");
const { PlatformPagesPage } = await import("../platform/PlatformPagesPage");
const { useSelectedTenant } = await import("./selected-tenant.store");

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useSelectedTenant.setState({ key: "main" });
  tenantsApi.list.mockResolvedValue([
    { id: 1, key: "main", name: "main", status: "active" },
    { id: 2, key: "shop-a", name: "Магазин", status: "active" },
  ]);
  content.listScenarios.mockResolvedValue([]);
  content.listPages.mockResolvedValue([]);
});

describe("перехід між екранами", () => {
  it("вибір на «Боті» відкриває «Платформу» вже в тому проєкті", async () => {
    render(<BotScenariosPage />);
    await waitFor(() => expect(content.listScenarios).toHaveBeenCalledWith("main"));

    fireEvent.change(await screen.findByLabelText("Проєкт"), { target: { value: "shop-a" } });
    await waitFor(() => expect(content.listScenarios).toHaveBeenLastCalledWith("shop-a"));

    cleanup();
    render(<PlatformPagesPage />);

    await waitFor(() => expect(content.listPages).toHaveBeenCalledWith("shop-a"));
    expect(screen.getByLabelText("Проєкт")).toHaveProperty("value", "shop-a");
  });
});
