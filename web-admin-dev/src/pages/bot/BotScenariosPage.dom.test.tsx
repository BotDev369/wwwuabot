// @vitest-environment jsdom
/**
 * Екран «Бот»: список за ключем, картка з типом, збереження й помилки.
 *
 * @module web-admin-dev/src/pages/bot/BotScenariosPage.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const api = vi.hoisted(() => ({
  list: vi.fn(),
  read: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
}));
vi.mock("../../shared/api/scenarios-admin.api", () => ({
  listBotScenarios: api.list,
  readBotScenario: api.read,
  updateBotScenario: api.update,
  createBotScenario: api.create,
}));

const tenantsApi = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("../../shared/api/tenants.api", () => ({
  listActiveTenants: tenantsApi.list,
  listAdminTenants: tenantsApi.list,
}));

const { BotScenariosPage } = await import("./BotScenariosPage");
const { useSelectedTenant } = await import("../tenant/selected-tenant.store");

const ITEM = {
  id: 1,
  lookup: "/start",
  kind: "widget",
  is_active: 1,
  updated_at: "2026-11-12 00:00:00",
};

const RECORD = {
  ...ITEM,
  widget_html: "<h1>ПАЛЯНИЦЯ</h1>",
  widget_data: "{}",
  rich_html: "<h1>ПАЛЯНИЦЯ</h1>",
  notify_groups: null,
  notify_template: null,
};

const MAIN = { id: 1, key: "main", name: "main", status: "active" };
const SHOP = { id: 2, key: "shop-a", name: "Магазин", status: "active" };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useSelectedTenant.setState({ key: "main" });
  api.list.mockResolvedValue([ITEM]);
  api.read.mockResolvedValue(RECORD);
  api.update.mockResolvedValue(undefined);
  tenantsApi.list.mockResolvedValue([MAIN, SHOP]);
});

describe("BotScenariosPage", () => {
  it("показує ключ і тип", async () => {
    render(<BotScenariosPage />);

    expect(await screen.findByText("/start")).toBeTruthy();
    expect(screen.getByText("Віджет")).toBeTruthy();
  });

  it("порожній пошук пояснює, що нічого не знайдено", async () => {
    render(<BotScenariosPage />);
    await screen.findByText("/start");

    fireEvent.change(screen.getByPlaceholderText(/Пошук/), { target: { value: "нема" } });
    expect(screen.getByText(/Нічого не знайдено/)).toBeTruthy();
  });

  it("картка відкривається, зберігає поля й закривається", async () => {
    render(<BotScenariosPage />);
    await screen.findByText("/start");

    fireEvent.click(screen.getByRole("button", { name: "Відкрити" }));
    await waitFor(() => expect(api.read).toHaveBeenCalledWith(1, "main"));

    fireEvent.change(screen.getByLabelText("HTML віджета"), {
      target: { value: "<h1>Новий екран</h1>" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Зберегти" }));

    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          widget_html: "<h1>Новий екран</h1>",
          kind: "widget",
          is_active: 1,
        }),
        "main",
      ),
    );
    await waitFor(() => expect(screen.queryByRole("button", { name: "Зберегти" })).toBeNull());
  });

  it("помилка збереження лишається в картці", async () => {
    api.update.mockRejectedValueOnce(new Error("HTML завеликий"));
    render(<BotScenariosPage />);
    await screen.findByText("/start");

    fireEvent.click(screen.getByRole("button", { name: "Відкрити" }));
    await waitFor(() => expect(api.read).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Зберегти" }));

    expect(await screen.findByText("HTML завеликий")).toBeTruthy();
  });

  it("селект проєкту передає ключ у список і запам'ятовує вибір", async () => {
    render(<BotScenariosPage />);
    await screen.findByText("/start");
    expect(api.list).toHaveBeenCalledWith("main");

    fireEvent.change(await screen.findByLabelText("Проєкт"), { target: { value: "shop-a" } });

    await waitFor(() => expect(api.list).toHaveBeenCalledWith("shop-a"));
    expect(localStorage.getItem("wb.admin.tenant")).toBe("shop-a");
  });

  it("створює екран у вибраному проєкті й одразу показує його", async () => {
    useSelectedTenant.setState({ key: "shop-a" });
    const created = { ...ITEM, id: 12, lookup: "/about", widget_html: "<b>Про нас</b>" };
    api.create.mockResolvedValue(created);

    render(<BotScenariosPage />);
    await screen.findByText("/start");

    fireEvent.click(screen.getByRole("button", { name: "Новий екран" }));
    fireEvent.change(screen.getByPlaceholderText("/start, about, текст кнопки…"), {
      target: { value: "/about" },
    });
    fireEvent.change(screen.getByLabelText("HTML екрана"), {
      target: { value: "<b>Про нас</b>" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Створити" }));

    await waitFor(() =>
      expect(api.create).toHaveBeenCalledWith(
        "/about",
        expect.objectContaining({ kind: "widget", widget_html: "<b>Про нас</b>" }),
        "shop-a",
      ),
    );
    // Список перечитано з тим самим проєктом, а картка нового екрана вже відкрита.
    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("heading", { name: "/about" })).toBeTruthy();
  });

  it("повторний ключ — зрозуміла помилка, а не тихий збій", async () => {
    api.create.mockRejectedValue(new Error("lookup_taken"));

    render(<BotScenariosPage />);
    await screen.findByText("/start");

    fireEvent.click(screen.getByRole("button", { name: "Новий екран" }));
    fireEvent.change(screen.getByPlaceholderText("/start, about, текст кнопки…"), {
      target: { value: "/start" },
    });
    fireEvent.change(screen.getByLabelText("HTML екрана"), { target: { value: "<b>є</b>" } });
    fireEvent.click(screen.getByRole("button", { name: "Створити" }));

    expect(await screen.findByText(/Такий ключ уже є в цьому проєкті/)).toBeTruthy();
  });

  it("недоступний проєкт показує пояснення, а не порожній список", async () => {
    api.list.mockRejectedValueOnce(new Error("tenant_not_found"));

    render(<BotScenariosPage />);

    expect(await screen.findByText(/Проєкт недоступний/)).toBeTruthy();
  });

  it("⛔ не вдалося завантажити — показує причину й дає повторити", async () => {
    api.list.mockRejectedValueOnce(new Error("мережа"));
    render(<BotScenariosPage />);

    expect(await screen.findByText(/мережа/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Спробувати ще" }));
    expect(await screen.findByText("/start")).toBeTruthy();
  });
});
