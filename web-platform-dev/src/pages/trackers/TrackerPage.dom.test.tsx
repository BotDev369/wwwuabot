// @vitest-environment jsdom
/**
 * Один трекер: звіт рахується з тих самих рядків, що й графік.
 *
 * Перевіряємо те, що не видно очима в коді: вікно звіту справді міняється,
 * правка дня підставляє вже збережене число, а «Прибрати» йде через діалог —
 * без нього трекер зникав би одним дотиком.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerPage.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Tracker, TrackerEntry } from "@wwwuabot/shared/trackers";

const hooks = {
  navigate: vi.fn(),
  alert: vi.fn(),
  confirm: vi.fn(async () => false),
  save: vi.fn(async () => true),
  remove: vi.fn(async () => true),
  archive: vi.fn(async () => true),
  reload: vi.fn(),
};

const water: Tracker = {
  id: 1,
  key: "water",
  title: "Вода",
  unit: "л",
  step: 0.25,
  goal: 2,
  min: 0,
  max: 20,
  icon: "droplet",
  isBuiltin: true,
};

const state = {
  tracker: water as Tracker | null,
  entries: [] as TrackerEntry[],
  endDay: "2026-10-17",
  loading: false,
  error: null as string | null,
  saving: false,
  reload: hooks.reload,
  save: hooks.save,
  remove: hooks.remove,
  archive: hooks.archive,
};

vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "1" }),
  useNavigate: () => hooks.navigate,
}));
vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));
vi.mock("@wwwuabot/ui/dialog", () => ({
  useDialog: () => ({ alert: hooks.alert, confirm: hooks.confirm }),
}));
vi.mock("./useTracker", () => ({ useTracker: () => state }));

const { TrackerPage } = await import("./TrackerPage");

beforeEach(() => {
  vi.clearAllMocks();
  state.tracker = water;
  state.loading = false;
  state.error = null;
  state.saving = false;
  state.entries = [
    { day: "2026-10-17", value: 2, note: "" },
    { day: "2026-10-16", value: 1.5, note: "після бігу" },
    { day: "2026-10-15", value: 1, note: "" },
  ];
});

describe("звіт", () => {
  it("середнє, серія й дні з записом рахуються з історії", () => {
    const { container } = render(<TrackerPage />);
    const stats = container.querySelector(".wb-tracker-stats") as HTMLElement;

    expect(within(stats).getByText("1,5 л")).toBeTruthy();
    expect(within(stats).getByText("3 з 30")).toBeTruthy();
    expect(within(stats).getByText("3 дн.")).toBeTruthy();
  });

  it("вікно звіту справді звужується", async () => {
    render(<TrackerPage />);

    await userEvent.click(screen.getByRole("button", { name: "7 дн." }));

    expect(screen.getByText("3 з 7")).toBeTruthy();
    expect(screen.getByRole("button", { name: "7 дн." }).getAttribute("aria-pressed")).toBe("true");
  });

  it("ціль виконано — число днів, а не середнє", () => {
    render(<TrackerPage />);

    expect(screen.getByText("1 з 30 · 3%")).toBeTruthy();
  });

  it("порожній трекер каже, з чого почати", () => {
    state.entries = [];
    render(<TrackerPage />);

    expect(screen.getByText(/Записів ще немає/)).toBeTruthy();
  });
});

describe("запис дня", () => {
  it("збереження надсилає день, число й нотатку", async () => {
    render(<TrackerPage />);

    await userEvent.click(screen.getByRole("button", { name: "Зберегти" }));

    expect(hooks.save).toHaveBeenCalledWith("2026-10-17", 2, "");
  });

  it("порожнє поле не стає нулем — екран каже про це", async () => {
    state.entries = [];
    render(<TrackerPage />);

    await userEvent.click(screen.getByRole("button", { name: "Зберегти" }));

    expect(hooks.save).not.toHaveBeenCalled();
    expect(hooks.alert).toHaveBeenCalled();
  });

  it("рядок історії підставляє свій день і значення у форму", async () => {
    render(<TrackerPage />);

    await userEvent.click(screen.getByRole("button", { name: /^16\.10/ }));

    expect((screen.getByLabelText("День") as HTMLInputElement).value).toBe("2026-10-16");
    expect((screen.getByLabelText("Значення, л") as HTMLInputElement).value).toBe("1.5");
    expect((screen.getByLabelText("Нотатка") as HTMLInputElement).value).toBe("після бігу");
  });

  it("прибирання дня питає підтвердження", async () => {
    render(<TrackerPage />);

    await userEvent.click(screen.getByRole("button", { name: "Прибрати запис за 17.10" }));

    expect(hooks.confirm).toHaveBeenCalled();
    expect(hooks.remove).not.toHaveBeenCalled();

    hooks.confirm.mockResolvedValueOnce(true);
    await userEvent.click(screen.getByRole("button", { name: "Прибрати запис за 17.10" }));
    expect(hooks.remove).toHaveBeenCalledWith("2026-10-17");
  });
});

describe("прибирання трекера", () => {
  it("без підтвердження нічого не зникає", async () => {
    render(<TrackerPage />);

    await userEvent.click(screen.getByRole("button", { name: /Прибрати трекер/ }));

    expect(hooks.confirm).toHaveBeenCalled();
    expect(hooks.archive).not.toHaveBeenCalled();
  });

  it("після підтвердження веде до списку", async () => {
    hooks.confirm.mockResolvedValueOnce(true);
    render(<TrackerPage />);

    await userEvent.click(screen.getByRole("button", { name: /Прибрати трекер/ }));

    expect(hooks.archive).toHaveBeenCalled();
    expect(hooks.navigate).toHaveBeenCalledWith("/trackers", { replace: true });
  });
});
