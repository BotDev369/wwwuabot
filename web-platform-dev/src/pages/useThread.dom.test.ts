// @vitest-environment jsdom
/**
 * Стрічка розмови: **дані належать тому, для кого їх принесли**.
 *
 * Три рішення, які видно на екрані одразу. Перше — «завантажується» не є
 * порожньою розмовою: поки даних для **цього** співрозмовника немає, стара
 * переписка не показується (інакше на мить ми бачимо чужу). Друге —
 * надіслане додається з відповіді сервера: стрічка не малює того, що сервер не
 * підтвердив. Третє — прочитаним позначає сервер, а бейдж перечитується одразу
 * після вдалого читання, а не наступного опитування.
 *
 * І головне про фото: **завантажене фото не потрапляє в переписку до
 * надсилання**. Воно належить людині, поки вона його не віддала назад або не
 * прибрала, тож стрічка про нього мовчить.
 *
 * @module web-platform-dev/src/pages/useThread.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { Message, MessagePeer } from "@wwwuabot/shared/messages";

const notifyUnreadChanged = vi.fn();

vi.mock("@wwwuabot/shared/messages", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  notifyUnreadChanged: (...args: unknown[]) => notifyUnreadChanged(...args),
}));

const api = {
  thread: vi.fn(),
  markRead: vi.fn(),
  send: vi.fn(),
  attach: vi.fn(),
  clear: vi.fn(),
  remove: vi.fn(),
};

vi.mock("../shared/api/messages.api", () => ({ messagesApi: api }));

const { useThread } = await import("./useThread");

const PEER = 42;

const peer: MessagePeer = {
  id: PEER,
  firstName: "Сергій",
  lastName: null,
  username: "serg",
  platformUsername: "karas",
  contactName: null,
  photoUrl: null,
};

const message = (id: number, body: string): Message => ({
  id,
  senderId: PEER,
  body,
  createdAt: "2026-10-05 12:00:00",
  readAt: null,
  system: false,
  media: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  api.thread.mockResolvedValue({ peer, messages: [message(1, "привіт")] });
  api.markRead.mockResolvedValue(undefined);
  api.send.mockResolvedValue(message(2, "да"));
  api.attach.mockResolvedValue({ id: 9, key: "msg/777/abcdef.png" });
  api.clear.mockResolvedValue(undefined);
  api.remove.mockResolvedValue(undefined);
});

describe("відкриття розмови", () => {
  it("без співрозмовника не питає нічого й не показує розмову", () => {
    const { result } = renderHook(() => useThread(null));

    expect(result.current.loading).toBe(false);
    expect(result.current.messages).toEqual([]);
    expect(api.thread).not.toHaveBeenCalled();
  });

  it("поки даних для цього ще немає — стрічка порожня й завантажується", async () => {
    const { result } = renderHook(() => useThread(PEER));

    expect(result.current.messages).toEqual([]);
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    expect(result.current.peer?.id).toBe(PEER);
    expect(result.current.loading).toBe(false);
  });

  it("позначає прочитаним після вдалого читання й одразу каже бейджу перечитатися", async () => {
    renderHook(() => useThread(PEER));

    await waitFor(() => expect(api.markRead).toHaveBeenCalledWith(PEER));
    expect(notifyUnreadChanged).toHaveBeenCalled();
  });

  it("невдале читання показує причину, а не порожню розмову", async () => {
    api.thread.mockRejectedValue(new Error("Розмову не знайдено"));

    const { result } = renderHook(() => useThread(PEER));

    await waitFor(() => expect(result.current.error).toBe("Розмову не знайдено"));
    expect(result.current.loading).toBe(false);
    expect(api.markRead).not.toHaveBeenCalled();
  });
});

describe("надсилання", () => {
  it("додає бульбашку з відповіді сервера, а не з того, що введено", async () => {
    const { result } = renderHook(() => useThread(PEER));
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    let sent = false;
    await act(async () => {
      sent = await result.current.send("да", null);
    });

    expect(sent).toBe(true);
    expect(api.send).toHaveBeenCalledWith(PEER, "да", null, null);
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].id).toBe(2);
  });

  it("фото йде номером, а не адресою: стрічка тримає його лише до надсилання", async () => {
    const { result } = renderHook(() => useThread(PEER));
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    let attached: { id: number; key: string } = { id: 0, key: "" };
    await act(async () => {
      attached = await result.current.attach(new File([new Uint8Array([1])], "p.png"));
    });
    expect(api.attach).toHaveBeenCalledWith(PEER, expect.any(File));
    expect(attached).toEqual({ id: 9, key: "msg/777/abcdef.png" });

    // Завантажене фото в переписці ще немає — його вона володіє.
    expect(result.current.messages).toHaveLength(1);

    await act(async () => {
      await result.current.send("", attached.id);
    });
    expect(api.send).toHaveBeenCalledWith(PEER, "", null, 9);
  });

  it("не підтверджене сервером надсилання не малюється й повертає false", async () => {
    api.send.mockResolvedValue(null);
    const { result } = renderHook(() => useThread(PEER));
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    let sent = true;
    await act(async () => {
      sent = await result.current.send("да", null);
    });

    expect(sent).toBe(false);
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.error).toContain("не підтвердив");
  });

  it("без відкритої розмови надіслати не можна", async () => {
    const { result } = renderHook(() => useThread(null));

    let sent = true;
    await act(async () => {
      sent = await result.current.send("да", null);
    });

    expect(sent).toBe(false);
    expect(api.send).not.toHaveBeenCalled();
  });
});

describe("чистка й видалення", () => {
  it("стирає стрічку лише після підтвердження сервера", async () => {
    const { result } = renderHook(() => useThread(PEER));
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    let cleared = true;
    await act(async () => {
      cleared = await result.current.clear();
    });

    expect(cleared).toBe(true);
    expect(result.current.messages).toEqual([]);
    expect(notifyUnreadChanged).toHaveBeenCalled();
  });

  it("невдале стирання не малює порожньої переписки", async () => {
    api.clear.mockRejectedValue(new Error("Немає доступу"));
    const { result } = renderHook(() => useThread(PEER));
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    let cleared = true;
    await act(async () => {
      cleared = await result.current.clear();
    });

    expect(cleared).toBe(false);
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.error).toBe("Немає доступу");
  });

  it("видалення розмови знімає її непрочитане й не готує порожню стрічку", async () => {
    const { result } = renderHook(() => useThread(PEER));
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    let removed = false;
    await act(async () => {
      removed = await result.current.remove();
    });

    expect(removed).toBe(true);
    expect(api.remove).toHaveBeenCalledWith(PEER);
    // Наступне відкриття однаково перечитає розмову — готувати порожню означало
    // б вигадати стан, якого в базі може не бути.
    expect(result.current.messages).toHaveLength(1);
  });

  it("без розмови ні чистити, ні видаляти", async () => {
    const { result } = renderHook(() => useThread(null));

    await act(async () => {
      expect(await result.current.clear()).toBe(false);
      expect(await result.current.remove()).toBe(false);
    });

    expect(api.clear).not.toHaveBeenCalled();
    expect(api.remove).not.toHaveBeenCalled();
  });
});
