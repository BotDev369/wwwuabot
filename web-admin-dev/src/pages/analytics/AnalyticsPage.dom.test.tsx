// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EventList, EventSummary, UserEvent } from "@wwwuabot/shared/events";

const api = vi.hoisted(() => ({
  summary: vi.fn(),
  events: vi.fn(),
  cleanup: vi.fn(),
  users: vi.fn(),
}));

vi.mock("../../shared/api/events.api", () => ({
  fetchEventSummary: api.summary,
  fetchEvents: api.events,
  cleanupEvents: api.cleanup,
  fetchEventUsers: api.users,
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
  // Вигляд екрана переживає перезавантаження вкладки — тест мусить починати
  // з чистого аркуша, інакше бачить режим попереднього тесту.
  sessionStorage.clear();
  api.summary.mockResolvedValue(SUMMARY);
  api.events.mockResolvedValue(list([botEvent]));
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
    // Закритий акордеон: ім'я й хендл, номера немає — він у розкритому.
    expect(screen.getByText("@DiskantSergiy")).toBeTruthy();
    expect(screen.queryByText("ID 7")).toBeNull();
  });

  it("розгортає людину й тягне саме її дії", async () => {
    render(<AnalyticsPage />);
    const head = await screen.findByRole("button", { name: /Сергій Дискант/ });

    await userEvent.click(head);

    await waitFor(() => expect(screen.getByText("/start")).toBeTruthy());
    // Номер показується лише під розкритим акордеоном.
    expect(screen.getByText("ID 7")).toBeTruthy();
    expect(api.events).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, limit: 100 }));
    // Повторний дотик закриває акордеон, а не тягне ті самі дії вдруге.
    await userEvent.click(head);
    expect(screen.queryByText("/start")).toBeNull();
    expect(api.events).toHaveBeenCalledTimes(1);
  });

  it("показує завантаження розгорнутої людини, доки її запит не завершився", async () => {
    let resolveEvents: (value: EventList) => void = () => undefined;
    api.events.mockReturnValueOnce(
      new Promise<EventList>((resolve) => {
        resolveEvents = resolve;
      }),
    );
    render(<AnalyticsPage />);
    const head = await screen.findByRole("button", { name: /Сергій Дискант/ });

    await userEvent.click(head);

    expect(await screen.findByText("Завантаження дій…")).toBeTruthy();
    await act(async () => {
      resolveEvents(list([botEvent]));
    });
    expect(await screen.findByText("/start")).toBeTruthy();
    expect(screen.queryByText("Завантаження дій…")).toBeNull();
  });

  it("«За часом» показує суцільний список із людиною в рядку", async () => {
    api.events.mockResolvedValue(list([platformEvent, botEvent]));
    render(<AnalyticsPage />);

    await userEvent.click(screen.getByRole("tab", { name: "За часом" }));

    // Рядок — назва сторінки/дії без методу й без дієслова.
    await waitFor(() => expect(screen.getByText("/api/favorites")).toBeTruthy());
    expect(screen.queryByText("GET")).toBeNull();
    // Обидві події — однієї людини, тож ім'я в кожному рядку.
    expect(screen.getAllByText("Сергій Дискант")).toHaveLength(2);
    expect(api.events.mock.calls[0]?.[0]).not.toHaveProperty("userId");
  });

  it("період вибирають у модалці, а кнопка називає обране", async () => {
    render(<AnalyticsPage />);
    await screen.findByText("Сергій Дискант");

    // Кнопка показує поточний період і відкриває поверхню.
    const trigger = screen.getByRole("button", { name: /Доба/ });
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole("button", { name: "Тиждень" }));

    await waitFor(() => expect(api.summary).toHaveBeenCalledTimes(2));
    // Готовий проміжок застосовується дотиком і закриває поверхню.
    expect(screen.queryByRole("dialog", { name: "Період" })).toBeNull();
    expect(screen.getByRole("button", { name: /Тиждень/ })).toBeTruthy();
  });

  it("«Період» бере межі з модалки й лишається обраним", async () => {
    render(<AnalyticsPage />);
    await screen.findByText("Сергій Дискант");

    await userEvent.click(screen.getByRole("button", { name: /Доба/ }));
    // date-полю значення дають зміною, а не посимвольним набором.
    fireEvent.change(screen.getByLabelText("Від"), { target: { value: "2026-10-01T00:00" } });
    fireEvent.change(screen.getByLabelText("До"), { target: { value: "2026-10-02T00:00" } });
    await userEvent.click(screen.getByRole("button", { name: "Застосувати" }));

    await waitFor(() => expect(api.summary).toHaveBeenCalledTimes(2));
    expect(api.summary.mock.calls[1]?.[0]).toEqual({
      from: new Date("2026-10-01T00:00").toISOString(),
      to: new Date("2026-10-02T00:00").toISOString(),
    });
    expect(screen.getByRole("button", { name: /Період/ }).textContent).toContain("Період");
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

  it("«Оновити» не скидає вигляд: акордеон лишається відкритим і оновлює дії", async () => {
    render(<AnalyticsPage />);
    const head = await screen.findByRole("button", { name: /Сергій Дискант/ });
    await userEvent.click(head);
    await screen.findByText("/start");

    await userEvent.click(screen.getByRole("button", { name: /Оновити|Оновлюю/ }));

    await waitFor(() => expect(api.summary).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(api.events).toHaveBeenLastCalledWith(expect.objectContaining({ userId: 7 })),
    );
    expect(head.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("/start")).toBeTruthy();
  });

  it("перезавантаження вкладки повертає вигляд: період і відкритий акордеон", async () => {
    const first = render(<AnalyticsPage />);
    await screen.findByText("Сергій Дискант");
    await userEvent.click(screen.getByRole("button", { name: /Доба/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Тиждень" }));
    await userEvent.click(screen.getByRole("button", { name: /Сергій Дискант/ }));
    await screen.findByText("/start");
    first.unmount();

    render(<AnalyticsPage />);

    const head = await screen.findByRole("button", { name: /Сергій Дискант/ });
    expect(head.getAttribute("aria-expanded")).toBe("true");
    // Період повернувся той самий: кнопка називає обране.
    expect(screen.getByRole("button", { name: /Тиждень/ }).textContent).toContain("Тиждень");
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
