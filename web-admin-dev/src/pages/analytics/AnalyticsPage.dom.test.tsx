// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EventList, EventSummary, UserEvent } from "@wwwuabot/shared/events";

const api = vi.hoisted(() => ({
  summary: vi.fn(),
  events: vi.fn(),
  cleanup: vi.fn(),
  users: vi.fn(),
  logging: vi.fn(),
  saveLogging: vi.fn(),
}));

vi.mock("../../shared/api/events.api", () => ({
  fetchEventSummary: api.summary,
  fetchEvents: api.events,
  cleanupEvents: api.cleanup,
  fetchEventUsers: api.users,
  fetchEventLogging: api.logging,
  saveEventLogging: api.saveLogging,
}));

const { AnalyticsPage } = await import("./AnalyticsPage");
const { DialogProvider } = await import("@wwwuabot/ui/dialog");

const PERSON = { userId: 7, firstName: "Сергій", lastName: "Дискант", username: "DiskantSergiy" };

const SUMMARY: EventSummary = {
  from: "2026-10-01T00:00:00.000Z",
  to: "2026-10-02T00:00:00.000Z",
  total: 3,
  bySurface: { bot: 2, platform: 1 },
  users: [{ ...PERSON, count: 3, lastAt: "2026-10-01 12:00:00" }],
};

const botEvent: UserEvent = {
  id: 1,
  surface: "bot",
  kind: "command",
  action: "/start",
  details: null,
  status: "ok",
  createdAt: "2026-10-01 12:00:00",
  ...PERSON,
};

const platformEvent: UserEvent = {
  ...botEvent,
  id: 2,
  surface: "platform",
  kind: "request",
  action: "GET /api/favorites",
};

const list = (items: UserEvent[], total = items.length): EventList => ({
  from: SUMMARY.from,
  to: SUMMARY.to,
  total,
  items,
});

beforeEach(() => {
  // Саме `reset`: «once»-відповіді, які тест не використав, інакше дістаються
  // наступному тестові, і той бачить чужі дані.
  vi.resetAllMocks();
  api.summary.mockResolvedValue(SUMMARY);
  api.events.mockResolvedValue(list([botEvent]));
  api.logging.mockResolvedValue(true);
  api.users.mockResolvedValue([
    { ...PERSON, count: 3, lastAt: "2026-10-01 12:00:00" },
    { userId: 9, firstName: null, lastName: null, username: null, count: 1, lastAt: "—" },
  ]);
});

describe("екран «Аналітика»", () => {
  it("показує зведення й людей діапазону", async () => {
    render(<AnalyticsPage />);

    expect(await screen.findByText("Сергій Дискант")).toBeTruthy();
    // Зведення — знаки з підказкою, а не підписи під числом.
    expect(screen.getByTitle("подій").textContent).toBe("3");
    expect(screen.getByTitle("у боті").textContent).toBe("2");
    expect(screen.getByTitle("на платформі").textContent).toBe("1");
    expect(screen.getByText("@DiskantSergiy · 7")).toBeTruthy();
  });

  it("розгортає людину й тягне саме її дії", async () => {
    render(<AnalyticsPage />);
    const head = await screen.findByRole("button", { name: /Сергій Дискант/ });

    await userEvent.click(head);

    await waitFor(() => expect(screen.getByText("/start")).toBeTruthy());
    expect(api.events).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, limit: 100 }));
    // Повторний дотик закриває акордеон, а не тягне ті самі дії вдруге.
    await userEvent.click(head);
    expect(screen.queryByText("/start")).toBeNull();
    expect(api.events).toHaveBeenCalledTimes(1);
  });

  it("«За часом» показує суцільний список без людини", async () => {
    api.events.mockResolvedValue(list([platformEvent, botEvent]));
    render(<AnalyticsPage />);

    await userEvent.click(screen.getByRole("tab", { name: "За часом" }));

    await waitFor(() => expect(screen.getByText("/api/favorites")).toBeTruthy());
    expect(screen.getByText("GET")).toBeTruthy();
    expect(api.events.mock.calls[0]?.[0]).not.toHaveProperty("userId");
  });

  it("готовий проміжок перезавантажує журнал", async () => {
    render(<AnalyticsPage />);
    await screen.findByText("Сергій Дискант");

    await userEvent.click(screen.getByRole("button", { name: "Тиждень" }));

    await waitFor(() => expect(api.summary).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", { name: "Тиждень" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("«Період» бере межі з модалки й лишається обраним", async () => {
    render(<AnalyticsPage />);
    await screen.findByText("Сергій Дискант");

    await userEvent.click(screen.getByRole("button", { name: /Період/ }));
    // date-полю значення дають зміною, а не посимвольним набором.
    fireEvent.change(screen.getByLabelText("Від"), { target: { value: "2026-10-01T00:00" } });
    fireEvent.change(screen.getByLabelText("До"), { target: { value: "2026-10-02T00:00" } });
    await userEvent.click(screen.getByRole("button", { name: "Застосувати" }));

    await waitFor(() => expect(api.summary).toHaveBeenCalledTimes(2));
    expect(api.summary.mock.calls[1]?.[0]).toEqual({
      from: new Date("2026-10-01T00:00").toISOString(),
      to: new Date("2026-10-02T00:00").toISOString(),
    });
    expect(screen.getByRole("button", { name: /Період/ }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });

  it("«Оновити» перечитує журнал, зсуває вікно й каже, коли це було", async () => {
    render(<AnalyticsPage />);
    await screen.findByText("Сергій Дискант");
    const firstTo = api.summary.mock.calls[0]?.[0].to as string;

    await userEvent.click(screen.getByRole("button", { name: /Оновити|Оновлюю/ }));

    await waitFor(() => expect(api.summary).toHaveBeenCalledTimes(2));
    const secondTo = api.summary.mock.calls[1]?.[0].to as string;
    expect(new Date(secondTo).getTime()).toBeGreaterThanOrEqual(new Date(firstTo).getTime());
    expect((await screen.findByRole("status")).textContent).toContain("оновлено о");
  });

  it("помилка читання називає причину, а не лишає порожній екран", async () => {
    api.summary.mockRejectedValue(new Error("Сесія прострочена"));

    render(<AnalyticsPage />);

    expect((await screen.findByRole("alert")).textContent).toContain("Сесія прострочена");
  });

  it("очищає журнал: спершу рахує, потім видаляє після підтвердження", async () => {
    api.cleanup.mockResolvedValueOnce({ matched: 4 }).mockResolvedValueOnce({ deleted: 4 });
    render(
      <DialogProvider>
        <AnalyticsPage />
      </DialogProvider>,
    );
    await screen.findByText("Сергій Дискант");

    await userEvent.click(screen.getByRole("button", { name: /Очистити журнал/ }));
    await userEvent.click(screen.getByRole("button", { name: "За весь час" }));
    await userEvent.click(screen.getByRole("button", { name: "Очистити" }));

    // Перший запит — лише підрахунок: нічого не зникає без підтвердження.
    await waitFor(() => expect(api.cleanup).toHaveBeenCalledTimes(1));
    expect(api.cleanup.mock.calls[0]?.[0]).toEqual({ all: true, dryRun: true });

    await userEvent.click(await screen.findByRole("button", { name: "Видалити" }));

    await waitFor(() => expect(api.cleanup).toHaveBeenCalledTimes(2));
    expect(api.cleanup.mock.calls[1]?.[0]).toEqual({ all: true });
  });

  it("людину вибирають зі списку журналу, а не вписують руками", async () => {
    api.cleanup.mockResolvedValueOnce({ matched: 1 }).mockResolvedValueOnce({ deleted: 1 });
    render(
      <DialogProvider>
        <AnalyticsPage />
      </DialogProvider>,
    );
    await screen.findByText("Сергій Дискант");

    await userEvent.click(screen.getByRole("button", { name: /Очистити журнал/ }));
    await userEvent.click(screen.getByRole("button", { name: "Один користувач" }));

    // Список — із самих логів: ім'я видно, номера знати не треба.
    const picker = document.querySelector(".ana-picker") as HTMLElement;
    const row = await within(picker).findByRole("button", { name: /Сергій Дискант/ });
    await userEvent.click(row);
    await userEvent.click(screen.getByRole("button", { name: "Очистити" }));

    await waitFor(() => expect(api.cleanup).toHaveBeenCalledTimes(1));
    expect(api.cleanup.mock.calls[0]?.[0]).toMatchObject({ userId: 7, dryRun: true });
  });

  it("без вибору людини не очищає — каже, чого бракує", async () => {
    render(
      <DialogProvider>
        <AnalyticsPage />
      </DialogProvider>,
    );
    await screen.findByText("Сергій Дискант");

    await userEvent.click(screen.getByRole("button", { name: /Очистити журнал/ }));
    await userEvent.click(screen.getByRole("button", { name: "Один користувач" }));
    await userEvent.click(screen.getByRole("button", { name: "Очистити" }));

    expect(screen.getByText("Вкажіть номер користувача")).toBeTruthy();
    expect(api.cleanup).not.toHaveBeenCalled();
  });

  it("коли під ознаки нічого не підпадає, журнал не чіпається", async () => {
    api.cleanup.mockResolvedValueOnce({ matched: 0 });
    render(
      <DialogProvider>
        <AnalyticsPage />
      </DialogProvider>,
    );
    await screen.findByText("Сергій Дискант");

    await userEvent.click(screen.getByRole("button", { name: /Очистити журнал/ }));
    await userEvent.click(screen.getByRole("button", { name: "За весь час" }));
    await userEvent.click(screen.getByRole("button", { name: "Очистити" }));

    expect(await screen.findByText(/не підпадає жодна подія/)).toBeTruthy();
    expect(api.cleanup).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Видалити" })).toBeNull();
  });

  it("помилка прибирання лишається на екрані, а не мовчить", async () => {
    api.cleanup.mockRejectedValueOnce(new Error("D1 недоступна"));
    render(
      <DialogProvider>
        <AnalyticsPage />
      </DialogProvider>,
    );
    await screen.findByText("Сергій Дискант");

    await userEvent.click(screen.getByRole("button", { name: /Очистити журнал/ }));
    await userEvent.click(screen.getByRole("button", { name: "За весь час" }));
    await userEvent.click(screen.getByRole("button", { name: "Очистити" }));

    expect(await screen.findByText("D1 недоступна")).toBeTruthy();
  });

  it("перемикач сквозна деталізація керує записом дотиків", async () => {
    api.saveLogging.mockResolvedValue(false);
    render(<AnalyticsPage />);
    await screen.findByText("Сергій Дискант");
    const toggle = await screen.findByRole("switch", { name: "Сквозна деталізація" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");

    await userEvent.click(toggle);

    await waitFor(() => expect(api.saveLogging).toHaveBeenCalledWith(false));
    await waitFor(() => expect(toggle.getAttribute("aria-checked")).toBe("false"));
  });

  it("догортає список і каже, скільки вже видно", async () => {
    api.events
      .mockResolvedValueOnce(list([platformEvent], 2))
      .mockResolvedValueOnce(list([botEvent], 2));
    render(<AnalyticsPage />);

    await userEvent.click(screen.getByRole("tab", { name: "За часом" }));
    await screen.findByText("/api/favorites");

    await userEvent.click(screen.getByRole("button", { name: "Показати ще" }));

    await waitFor(() => expect(screen.getByText("/start")).toBeTruthy());
    expect(api.events).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 1 }));
    expect(screen.getByText("Показано 2 з 2")).toBeTruthy();
  });
});
