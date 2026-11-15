/**
 * Клієнт «Стола»: адреси, методи й тіло запитів — без живих даних.
 *
 * Головне тут — форма запиту: сервер шукає рівно ці п'ять шляхів, а
 * завантаження їде multipart повз `apiFetch` (він ставить JSON-заголовок).
 *
 * @module web-admin-dev/src/pages/desk/desk.api.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addDeskEntry,
  deleteDeskEntry,
  deleteDeskFile,
  deskFileUrl,
  fetchDeskThread,
  fetchDeskThreads,
  markDeskRead,
  saveDeskThread,
  uploadDeskFile,
} from "./desk.api";

interface Seen {
  url: string;
  init: RequestInit;
}

function stub(payload: unknown, ok = true): Seen[] {
  const seen: Seen[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    seen.push({ url: String(url), init });
    return {
      ok,
      status: ok ? 200 : 400,
      json: async () => payload,
    } as Response;
  });
  return seen;
}

afterEach(() => vi.unstubAllGlobals());

describe("desk.api", () => {
  it("порожні фільтри не потрапляють в адресу, а задані — так", async () => {
    const seen = stub({ ok: true, threads: [], counts: {}, total: 0 });

    await fetchDeskThreads();
    expect(seen[0].url).toBe("/api/admin/desk/threads");

    await fetchDeskThreads({ group: "task", status: "all", q: "r2" });
    expect(seen[1].url).toBe("/api/admin/desk/threads?group=task&status=all&q=r2");
  });

  it("тема читається за id", async () => {
    const seen = stub({ ok: true, thread: {}, entries: [], files: [] });
    await fetchDeskThread(7);
    expect(seen[0].url).toBe("/api/admin/desk/thread?id=7");
  });

  it("запис і правка теми їдуть POST-ом із JSON", async () => {
    const seen = stub({ ok: true, thread: {}, entries: [], files: [] });

    await saveDeskThread({ title: "Нова", group: "plan" });
    expect(seen[0].url).toBe("/api/admin/desk/thread");
    expect(seen[0].init.method).toBe("POST");
    expect(seen[0].init.body).toBe('{"title":"Нова","group":"plan"}');

    await addDeskEntry({ thread_id: 7, body: "текст" });
    expect(seen[1].url).toBe("/api/admin/desk/entry");
    expect(seen[1].init.body).toBe('{"thread_id":7,"body":"текст"}');
  });

  it("видалення й позначка прочитаного — своїми методами", async () => {
    const seen = stub({ ok: true });
    await deleteDeskEntry(3);
    await deleteDeskFile(4);
    await markDeskRead(7, 11);

    expect(seen[0].url).toBe("/api/admin/desk/entry?id=3");
    expect(seen[0].init.method).toBe("DELETE");
    expect(seen[1].url).toBe("/api/admin/desk/file?id=4");
    expect(seen[2].url).toBe("/api/admin/desk/read");
    expect(seen[2].init.body).toBe('{"thread_id":7,"last_seen_entry_id":11}');
  });

  it("завантаження — multipart із темою, записом і файлом", async () => {
    const seen = stub({ ok: true, file: { id: 9, name: "a.txt" } });
    const file = new File(["hello"], "a.txt", { type: "text/plain" });

    const saved = await uploadDeskFile(7, 11, file);
    expect(saved.id).toBe(9);
    expect(seen[0].url).toBe("/api/admin/desk/file");
    expect(seen[0].init.method).toBe("POST");
    const form = seen[0].init.body as FormData;
    expect(form.get("thread")).toBe("7");
    expect(form.get("entry")).toBe("11");
    expect((form.get("file") as File).name).toBe("a.txt");

    // Файл до самої теми (без запису) — поле `entry` не їде взагалі.
    await uploadDeskFile(7, null, file);
    expect((seen[1].init.body as FormData).get("entry")).toBeNull();
  });

  it("помилку сервера віддає текстом, а не мовчки", async () => {
    stub({ ok: false, error: "too_big" }, false);
    await expect(uploadDeskFile(7, null, new File(["a"], "a.txt"))).rejects.toThrow("too_big");

    stub({ ok: false, error: "bad_id" }, false);
    await expect(fetchDeskThread(1)).rejects.toThrow("bad_id");
  });

  it("адреса файлу — той самий шлях, що й у посиланні", () => {
    expect(deskFileUrl(20)).toBe("/api/admin/desk/file?id=20");
  });
});
