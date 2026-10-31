// @vitest-environment jsdom
/**
 * Сторінка сценаріїв: стани, і головне — створення не перезаписує чужу адресу.
 *
 * @module web-admin-dev/src/pages/scenarios/ScenariosPage.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const store = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock("../../features/scenarios/store", () => {
  const hook = () => store.state;
  return { useScenariosStore: Object.assign(hook, { getState: () => store.state }) };
});

const api = vi.hoisted(() => ({
  read: vi.fn(async () => null as unknown),
  save: vi.fn(async () => {}),
}));
vi.mock("../../shared/api/scenarios.api", () => ({
  readScenario: api.read,
  saveScenarioFields: api.save,
}));

const dialog = vi.hoisted(() => ({
  prompt: vi.fn(async () => " New " as string | null),
  alert: vi.fn(async () => {}),
}));
vi.mock("@wwwuabot/ui/dialog", () => ({ useDialog: () => dialog }));

vi.mock("../scenarios-v2/ScenariosV2Table", () => ({
  ScenariosV2Table: () => <div data-testid="table" />,
}));
vi.mock("./ScenarioCardModal", () => ({
  ScenarioCardModal: ({ slug }: { slug: string }) => <div data-testid="card">{slug}</div>,
}));

const { ScenariosPage } = await import("./ScenariosPage");

function state(overrides: Record<string, unknown> = {}) {
  return { items: [{ slug: "a" }], status: "ready", errorMsg: "", load: vi.fn(), ...overrides };
}

beforeEach(() => {
  store.state = state();
  api.read.mockResolvedValue(null);
  api.save.mockClear();
  dialog.prompt.mockResolvedValue(" New ");
  dialog.alert.mockClear();
});

describe("ScenariosPage", () => {
  it("малює таблицю й лічильник", () => {
    render(<ScenariosPage />);

    expect(screen.getByTestId("table")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("поки вантажить і коли впало — різні тексти й повтор", () => {
    store.state = state({ status: "loading" });
    const loading = render(<ScenariosPage />);
    expect(screen.getByText("Завантаження сценаріїв…")).toBeTruthy();
    loading.unmount();

    const load = vi.fn();
    store.state = state({ status: "error", errorMsg: "D1 недоступна", load });
    render(<ScenariosPage />);
    expect(screen.getByText(/D1 недоступна/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Спробувати ще" }));
    expect(load).toHaveBeenCalledWith(true);
  });

  it("вільна адреса створює порожню сторінку й відкриває конструктор", async () => {
    render(<ScenariosPage />);

    fireEvent.click(screen.getByRole("button", { name: "+ Новий" }));

    await waitFor(() => expect(api.save).toHaveBeenCalled());
    expect(api.save).toHaveBeenCalledWith("new", expect.objectContaining({ title: "new" }));
    expect(await screen.findByTestId("card")).toBeTruthy();
  });

  it("зайнята адреса не перезаписується — це чужа сторінка", async () => {
    api.read.mockResolvedValueOnce({ slug: "new" });
    render(<ScenariosPage />);

    fireEvent.click(screen.getByRole("button", { name: "+ Новий" }));

    await waitFor(() => expect(dialog.alert).toHaveBeenCalled());
    expect(dialog.alert).toHaveBeenCalledWith(
      expect.stringContaining("вже зайнята"),
      expect.anything(),
    );
    expect(api.save).not.toHaveBeenCalled();
  });

  it("порожній ввід нічого не створює", async () => {
    dialog.prompt.mockResolvedValueOnce(null);
    render(<ScenariosPage />);

    fireEvent.click(screen.getByRole("button", { name: "+ Новий" }));
    await waitFor(() => expect(dialog.prompt).toHaveBeenCalled());

    expect(api.read).not.toHaveBeenCalled();
    expect(api.save).not.toHaveBeenCalled();
  });

  it("помилка збереження показується, а не губиться", async () => {
    api.save.mockRejectedValueOnce(new Error("KV недоступний"));
    render(<ScenariosPage />);

    fireEvent.click(screen.getByRole("button", { name: "+ Новий" }));

    await waitFor(() => expect(dialog.alert).toHaveBeenCalled());
    expect(dialog.alert).toHaveBeenCalledWith(
      expect.stringContaining("KV недоступний"),
      expect.anything(),
    );
    expect(screen.queryByTestId("card")).toBeNull();
  });
});
