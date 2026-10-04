/**
 * Контракт адмінського читача `users`: адреса, метод і **тіло запиту**.
 *
 * Адмінка ходить у `api-dev` за `/api/admin/users/*` з cookie `admin_session`;
 * тож помилка тут — це або мовчки не той ендпоїнт, або запис не туди, куди
 * адмін чекав (найчастіше — `ids` замість `user_id`, через що батчи не роблять
 * нічого і виглядають, що спрацювали).
 *
 * `readUserProfile` перевіряється окремо від `readUser`: він віддає вже
 * **спільний** профіль, і картка в адмінці та в платформі читають одне й те саме
 * правило перекладу.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  blockUser,
  bulkAction,
  deleteUser,
  listUsers,
  readUser,
  readUserProfile,
  sendMessage,
  updateUser,
} from "./users.api";

const reload = vi.fn();

function response(status: number, body: unknown = {}): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}

function stubFetch(result: Response | ((url: string) => Response)) {
  const fetchMock = vi.fn(async (input: string, _init?: RequestInit) =>
    typeof result === "function" ? result(input) : result,
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Тіло останнього запиту: без нього тест перевіряв би самі себе. */
function lastCall(fetchMock: ReturnType<typeof vi.fn>): [string, RequestInit] {
  const calls = fetchMock.mock.calls;
  return calls[calls.length - 1] as unknown as [string, RequestInit];
}

function lastBody(fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown> {
  return JSON.parse(lastCall(fetchMock)[1].body as string) as Record<string, unknown>;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.stubGlobal("window", { location: { reload } });
});

describe("читання користувачів", () => {
  it("список береться з адмінського ендпоінта без тіла", async () => {
    const fetchMock = stubFetch(response(200, { success: true, items: [{ user_id: 1 }] }));
    await listUsers();

    const [url, init] = lastCall(fetchMock);
    expect(url).toBe("/api/admin/users/list");
    expect(init.method).toBeUndefined();
  });

  it("відповідь безitems — порожній список, а не падіння на undefined", async () => {
    stubFetch(response(200, { success: true }));
    expect(await listUsers()).toEqual([]);
  });

  it("читання одного рядка йде за user_id у тілі, а не в адресі", async () => {
    const fetchMock = stubFetch(response(200, { success: true, data: null }));
    await readUser(42);

    const [url, init] = lastCall(fetchMock);
    expect(url).toBe("/api/admin/users/read");
    expect(init.method).toBe("POST");
    expect(lastBody(fetchMock)).toEqual({ user_id: 42 });
  });
});

describe("профіль для картки", () => {
  it("рядок перекладається в спільний профіль", async () => {
    stubFetch(
      response(200, {
        success: true,
        data: { user_id: 42, first_name: "Олесь", platform_username: "karas" },
      }),
    );

    const profile = await readUserProfile(42);
    expect(profile?.id).toBe(42);
    expect(profile?.firstName).toBe("Олесь");
    expect(profile?.platformUsername).toBe("karas");
  });

  it("відсутній рядок — це null, а не профіль без даних", async () => {
    stubFetch(response(200, { success: true, data: null }));
    expect(await readUserProfile(42)).toBeNull();
  });
});

describe("записи", () => {
  it("оновлення розсилає поля разом із user_id", async () => {
    const fetchMock = stubFetch(response(200, { success: true }));
    await updateUser(42, { role: "moderator", tariff: "pro" });

    const [url, init] = lastCall(fetchMock);
    expect(url).toBe("/api/admin/users/update");
    expect(init.method).toBe("POST");
    expect(lastBody(fetchMock)).toEqual({ user_id: 42, role: "moderator", tariff: "pro" });
  });

  it("видалення повертає прапорчик із відповіді, а не «вийшло без помилки»", async () => {
    stubFetch(response(200, { success: true, deleted: false }));
    expect(await deleteUser(42)).toBe(false);
  });

  it("блокування відрізняє стан від дії", async () => {
    const fetchMock = stubFetch(response(200, { success: true }));
    await blockUser(42, true);
    expect(lastBody(fetchMock)).toEqual({ user_id: 42, blocked: true });
  });

  it("батч надсилає дію та список ids і повертає оброблені", async () => {
    const fetchMock = stubFetch(response(200, { success: true, processed: 2 }));
    const processed = await bulkAction("block", [1, 2]);

    const [url, init] = lastCall(fetchMock);
    expect(url).toBe("/api/admin/users/bulk");
    expect(init.method).toBe("POST");
    expect(lastBody(fetchMock)).toEqual({ action: "block", ids: [1, 2] });
    expect(processed).toBe(2);
  });

  it("повідомлення надсилається людині за user_id, а не в чат", async () => {
    const fetchMock = stubFetch(response(200, { success: true }));
    await sendMessage(42, "Привіт");

    const [url] = lastCall(fetchMock);
    expect(url).toBe("/api/admin/users/message");
    expect(lastBody(fetchMock)).toEqual({ user_id: 42, text: "Привіт" });
  });
});

describe("прострочена сесія", () => {
  it("401 перезавантажує сторінку й не повертає дані", async () => {
    stubFetch(response(401, { error: "unauthorized" }));
    await expect(listUsers()).rejects.toThrow("Session expired");
    expect(reload).toHaveBeenCalled();
  });
});
