// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EventList, EventSummary, UserEvent } from "@wwwuabot/shared/events";

const api = vi.hoisted(() => ({ summary: vi.fn(), events: vi.fn() }));

vi.mock("../../shared/api/events.api", () => ({
  fetchEventSummary: api.summary,
  fetchEvents: api.events,
}));

const { AnalyticsPage } = await import("./AnalyticsPage");

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
  vi.clearAllMocks();
  api.summary.mockResolvedValue(SUMMARY);
  api.events.mockResolvedValue(list([botEvent]));
});

describe("екран «Аналітика»", () => {
  it("показує зведення й людей діапазону", async () => {
    render(<AnalyticsPage />);

    expect(await screen.findByText("Сергій Дискант")).toBeTruthy();
    expect(screen.getByText("подій")).toBeTruthy();
    expect(screen.getByText("у боті")).toBeTruthy();
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
