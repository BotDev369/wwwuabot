// @vitest-environment jsdom
/**
 * «Стіл» на живих даних: список, тема, композер, файли й черга.
 *
 * Мережа тут — підмінений модуль `desk.api` з маленьким сховищем у пам'яті:
 * тест перевіряє, що сторінка правильно читає відповіді й надсилає потрібне,
 * а не те, як працює `fetch`.
 *
 * @module web-admin-dev/src/pages/desk/DeskPage.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render as renderRaw, screen, waitFor } from "@testing-library/react";
import { DialogProvider } from "@wwwuabot/ui/dialog";
import type { DeskEntry, DeskFile, DeskSide, DeskThread } from "@wwwuabot/shared/desk/model";

const state = vi.hoisted(() => ({
  threads: [] as DeskThread[],
  entries: [] as DeskEntry[],
  files: [] as DeskFile[],
  read: [] as Array<[number, number]>,
  uploads: [] as string[],
}));

vi.mock("./desk.api", async () => {
  const readRoom = (id: number) => ({
    ok: true,
    thread: state.threads.find((thread) => thread.id === id)!,
    entries: state.entries.filter((entry) => entry.thread_id === id),
    files: state.files.filter((file) => file.thread_id === id),
  });

  return {
    deskFileUrl: (id: number) => `/api/admin/desk/file?id=${id}`,
    fetchDeskThreads: async (
      query: { group?: string; status?: string; q?: string; archived?: string } = {},
    ) => {
      const list = state.threads.filter((thread) => {
        const only = query.archived === "only";
        if (only ? !thread.archived : thread.archived) return false;
        if (query.group && query.group !== "all" && thread.group !== query.group) return false;
        if (query.status && query.status !== "all" && thread.status !== query.status) return false;
        if (query.q && !thread.title.toLowerCase().includes(query.q.toLowerCase())) return false;
        return true;
      });
      const counts: Record<string, number> = {};
      for (const thread of state.threads) counts[thread.group] = (counts[thread.group] ?? 0) + 1;
      return { ok: true, threads: list, counts, total: list.length };
    },
    fetchDeskThread: async (id: number) => readRoom(id),
    saveDeskThread: async (input: Record<string, unknown>) => {
      const id = Number(input.id);
      const existing = state.threads.find((thread) => thread.id === id);
      if (!existing) {
        const created: DeskThread = {
          ...(state.threads[0] as DeskThread),
          id: 99,
          title: String(input.title),
          group: String(input.group),
          status: "open",
          turn: "none",
          entries: 0,
          unread: 0,
        };
        state.threads.push(created);
        return readRoom(99);
      }
      Object.assign(existing, input);
      if (input.archived === true) existing.archived = true;
      if (input.archived === false) existing.archived = false;
      return readRoom(existing.id);
    },
    addDeskEntry: async (input: Record<string, unknown>) => {
      const threadId = Number(input.thread_id);
      // Правка приходить з `id` — тоді запис не додається, а переписується.
      const editing = state.entries.find((entry) => entry.id === Number(input.id));
      if (editing) {
        editing.kind = String(input.kind);
        editing.body = String(input.body);
        return readRoom(threadId);
      }
      state.entries.push({
        id: (last(state.entries)?.id ?? 100) + 1,
        thread_id: threadId,
        author: "serhii" as DeskSide,
        kind: String(input.kind),
        body: String(input.body),
        meta: {},
        reply_to: null,
        created_at: "2026-11-15 11:00:00",
        edited_at: null,
      });
      return readRoom(threadId);
    },
    deleteDeskThread: async (id: number) => {
      state.threads = state.threads.filter((thread) => thread.id !== id);
      state.entries = state.entries.filter((entry) => entry.thread_id !== id);
      state.files = state.files.filter((file) => file.thread_id !== id);
      return { ok: true };
    },
    deleteDeskEntry: async (id: number) => {
      state.entries = state.entries.filter((entry) => entry.id !== id);
      return { ok: true };
    },
    deleteDeskFile: async (id: number) => {
      state.files = state.files.filter((file) => file.id !== id);
      return { ok: true };
    },
    markDeskRead: async (threadId: number, seen: number) => {
      state.read.push([threadId, seen]);
      return { ok: true };
    },
    uploadDeskFile: async (threadId: number, entryId: number | null, file: File) => {
      state.uploads.push(file.name);
      const saved: DeskFile = {
        id: 500 + state.uploads.length,
        thread_id: threadId,
        entry_id: entryId,
        author: "serhii",
        name: file.name,
        mime: file.type,
        bytes: file.size,
        created_at: "2026-11-15 11:00:00",
      };
      state.files.push(saved);
      return saved;
    },
  };
});

const { DeskPage } = await import("./DeskPage");

function seed(): void {
  state.threads = [
    {
      id: 1,
      group: "task",
      subgroup: "Зберігання",
      title: "R2-бакет для обміну файлами",
      status: "open",
      turn: "buffy",
      tags: ["r2"],
      due_at: null,
      priority: 0,
      created_at: "2026-11-15 09:00:00",
      updated_at: "2026-11-15 09:40:00",
      last_entry_at: "2026-11-15 09:40:00",
      archived: false,
      entries: 2,
      unread: 0,
    },
    {
      id: 2,
      group: "plan",
      subgroup: "Дизайн",
      title: "Темна тема: контраст кнопок",
      status: "doing",
      turn: "serhii",
      tags: ["design"],
      due_at: null,
      priority: 0,
      created_at: "2026-11-12 14:00:00",
      updated_at: "2026-11-12 14:15:00",
      last_entry_at: "2026-11-12 14:15:00",
      archived: false,
      entries: 1,
      unread: 1,
    },
  ];
  state.entries = [
    {
      id: 10,
      thread_id: 1,
      author: "serhii",
      kind: "question",
      body: "Хочу окремий бакет для документів",
      meta: {},
      reply_to: null,
      created_at: "2026-11-15 09:12:00",
      edited_at: null,
    },
    {
      id: 11,
      thread_id: 1,
      author: "buffy",
      kind: "answer",
      body: "Папки в R2 — це префікси, потрібен індекс у D1",
      meta: {},
      reply_to: null,
      created_at: "2026-11-15 09:40:00",
      edited_at: null,
    },
  ];
  state.files = [
    {
      id: 20,
      thread_id: 1,
      entry_id: 11,
      author: "buffy",
      name: "bucket-plan.md",
      mime: "text/markdown",
      bytes: 12_000,
      created_at: "2026-11-15 09:40:00",
    },
  ];
  state.read = [];
  state.uploads = [];
}

function last<T>(list: T[]): T | undefined {
  return list.length > 0 ? list[list.length - 1] : undefined;
}

function threadTitles(): string[] {
  return [...document.querySelectorAll(".desk-thread-title")].map((el) => el.textContent ?? "");
}

function render(ui: React.ReactElement) {
  return renderRaw(<DialogProvider>{ui}</DialogProvider>);
}

describe("DeskPage на живих даних", () => {
  beforeEach(() => seed());

  it("малює групи з лічильниками й теми з сервера", async () => {
    const { container } = render(<DeskPage />);

    await waitFor(() => expect(threadTitles()).toHaveLength(2));
    const groups = container.querySelector(".desk-groups") as HTMLElement;
    expect(groups.textContent).toContain("Плани");
    expect(groups.textContent).toContain("Задачі");
    // Перша тема відкривається сама; непрочитане позначене чипом.
    await waitFor(() =>
      expect(container.querySelector(".desk-room-title")?.textContent).toBe(
        "R2-бакет для обміну файлами",
      ),
    );
    // Відкрита тема вже вичитана, а друга — ще ні: чип лишається на ній.
    expect(screen.getByText("нове")).toBeTruthy();
  });

  it("відкрита тема позначається вичитаною до останнього запису", async () => {
    render(<DeskPage />);
    await waitFor(() => expect(state.read.length).toBeGreaterThan(0));
    expect(state.read[0]).toEqual([1, 11]);
  });

  it("група й пошук питають сервер і лишають свої теми", async () => {
    render(<DeskPage />);
    await waitFor(() => expect(threadTitles()).toHaveLength(2));

    fireEvent.click(screen.getByText("Плани"));
    await waitFor(() => expect(threadTitles()).toEqual(["Темна тема: контраст кнопок"]));

    fireEvent.change(screen.getByLabelText("Пошук теми або тега"), {
      target: { value: "жодна" },
    });
    await waitFor(() => expect(screen.getByText("Немає тем за цим фільтром")).toBeTruthy());
  });

  it("тема показує стрічку, автора, файл-посилання й керування чергою", async () => {
    const { container } = render(<DeskPage />);

    await waitFor(() => expect(container.querySelectorAll(".desk-entry")).toHaveLength(2));
    expect(container.querySelector(".desk-entry--buffy")).toBeTruthy();
    const link = screen.getByText("bucket-plan.md") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/api/admin/desk/file?id=20");
    expect(screen.getByLabelText("Чия черга")).toBeTruthy();
  });

  it("зміна черги зберігається через API й перемальовує шапку", async () => {
    const { container } = render(<DeskPage />);
    await waitFor(() => expect(container.querySelectorAll(".desk-entry")).toHaveLength(2));

    fireEvent.change(screen.getByLabelText("Чия черга"), { target: { value: "serhii" } });
    await waitFor(() => expect(state.threads[0].turn).toBe("serhii"));
    expect(container.querySelector(".desk-room-tags")?.textContent).toContain("Чекає на Сергія");
  });

  it("композер додає запис, а Cmd+Enter надсилає з клавіатури", async () => {
    const { container } = render(<DeskPage />);
    await waitFor(() => expect(container.querySelectorAll(".desk-entry")).toHaveLength(2));

    const input = screen.getByLabelText("Написати в тему…");
    fireEvent.change(input, { target: { value: "  Перевірка живих даних  " } });
    fireEvent.keyDown(input, { key: "Enter", metaKey: true });

    await waitFor(() => expect(container.querySelectorAll(".desk-entry")).toHaveLength(3));
    expect(screen.getByText("Перевірка живих даних")).toBeTruthy();
    expect((input as HTMLTextAreaElement).value).toBe("");
    expect(last(state.entries)?.body).toBe("Перевірка живих даних");
  });

  it("файлів можна прикріпити скільки завгодно — усі їдуть у тему", async () => {
    const { container } = render(<DeskPage />);
    await waitFor(() => expect(container.querySelectorAll(".desk-entry")).toHaveLength(2));

    const picker = container.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [
      new File(["a"], "one.txt", { type: "text/plain" }),
      new File(["b"], "two.txt", { type: "text/plain" }),
      new File(["c"], "three.txt", { type: "text/plain" }),
    ];
    fireEvent.change(picker, { target: { files } });
    expect(container.querySelectorAll(".desk-file-chip")).toHaveLength(3);

    fireEvent.change(screen.getByLabelText("Написати в тему…"), {
      target: { value: "Три файли" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Надіслати" }));

    await waitFor(() => expect(state.uploads).toEqual(["one.txt", "two.txt", "three.txt"]));
    await waitFor(() =>
      expect([...document.querySelectorAll(".desk-file-name")].map((el) => el.textContent)).toEqual(
        expect.arrayContaining(["bucket-plan.md", "one.txt", "two.txt", "three.txt"]),
      ),
    );
    expect(container.querySelectorAll(".desk-file-chip")).toHaveLength(0);
  });

  it("без тексту але з файлом запис усе одно створюється", async () => {
    const { container } = render(<DeskPage />);
    await waitFor(() => expect(container.querySelectorAll(".desk-entry")).toHaveLength(2));

    const picker = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(picker, { target: { files: [new File(["a"], "photo.png")] } });
    fireEvent.click(screen.getByRole("button", { name: "Надіслати" }));

    await waitFor(() => expect(state.uploads).toEqual(["photo.png"]));
    expect(last(state.entries)).toMatchObject({ body: "photo.png", kind: "file" });
  });

  it("запис можна видалити — він зникає зі стрічки", async () => {
    const { container } = render(<DeskPage />);
    await waitFor(() => expect(container.querySelectorAll(".desk-entry")).toHaveLength(2));

    fireEvent.click(screen.getAllByLabelText("Видалити запис")[1]);
    fireEvent.click(await screen.findByRole("button", { name: "Видалити" }));
    await waitFor(() => expect(container.querySelectorAll(".desk-entry")).toHaveLength(1));
    expect(state.entries.map((entry) => entry.id)).toEqual([10]);
  });

  it("файл можна прибрати з теми", async () => {
    render(<DeskPage />);
    await waitFor(() => expect(screen.getByText("bucket-plan.md")).toBeTruthy());

    fireEvent.click(screen.getByLabelText("Видалити файл: bucket-plan.md"));
    fireEvent.click(await screen.findByRole("button", { name: "Видалити" }));
    await waitFor(() => expect(screen.queryByText("bucket-plan.md")).toBeNull());
  });

  it("порожній фільтр каже, що фільтр стоїть, і скидається однією кнопкою", async () => {
    render(<DeskPage />);
    await waitFor(() => expect(threadTitles()).toHaveLength(2));

    fireEvent.click(screen.getByText("Борги"));
    await waitFor(() => expect(screen.getByText("Немає тем за цим фільтром")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Скинути фільтри" }));
    await waitFor(() => expect(threadTitles()).toHaveLength(2));
  });

  it("новий запис теми не скидає вибраний фільтр", async () => {
    render(<DeskPage />);
    await waitFor(() => expect(threadTitles()).toHaveLength(2));

    fireEvent.click(screen.getByText("Задачі"));
    await waitFor(() => expect(threadTitles()).toEqual(["R2-бакет для обміну файлами"]));

    fireEvent.change(screen.getByLabelText("Написати в тему…"), {
      target: { value: "Пишу в тему" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Надіслати" }));
    await waitFor(() => expect(screen.getByText("Пишу в тему")).toBeTruthy());
    expect(threadTitles()).toEqual(["R2-бакет для обміну файлами"]);
  });

  it("тему можна відредагувати з шапки", async () => {
    const { container } = render(<DeskPage />);
    await waitFor(() => expect(container.querySelectorAll(".desk-entry")).toHaveLength(2));

    fireEvent.click(screen.getByRole("button", { name: "Редагувати тему" }));
    const title = screen.getByLabelText("Назва") as HTMLInputElement;
    expect(title.value).toBe("R2-бакет для обміну файлами");
    fireEvent.change(title, { target: { value: "R2-бакет: оновлено" } });
    fireEvent.change(screen.getByLabelText("Теги"), { target: { value: "r2, files" } });
    fireEvent.click(screen.getByRole("button", { name: "Зберегти" }));

    await waitFor(() =>
      expect(container.querySelector(".desk-room-title")?.textContent).toBe("R2-бакет: оновлено"),
    );
    expect(state.threads[0]).toMatchObject({ tags: ["r2", "files"] });
  });

  it("тему можна відправити в архів і повернути звідти", async () => {
    render(<DeskPage />);
    await waitFor(() => expect(threadTitles()).toHaveLength(2));

    fireEvent.click(screen.getByRole("button", { name: "Архівувати тему" }));
    await waitFor(() => expect(threadTitles()).toEqual(["Темна тема: контраст кнопок"]));

    fireEvent.click(screen.getByRole("button", { name: "Архів" }));
    await waitFor(() => expect(threadTitles()).toEqual(["R2-бакет для обміну файлами"]));
    fireEvent.click(screen.getByRole("button", { name: /R2-бакет/ }));
    expect(await screen.findByRole("button", { name: "Повернути тему з архіву" })).toBeTruthy();
  });

  it("тему можна видалити — з підтвердженням", async () => {
    render(<DeskPage />);
    await waitFor(() => expect(threadTitles()).toHaveLength(2));

    fireEvent.click(await screen.findByRole("button", { name: "Видалити тему" }));
    const confirm = await screen.findByText(
      "Видалити тему разом із записами й файлами? Це безповоротно.",
    );
    expect(confirm).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Видалити" }));

    await waitFor(() => expect(state.threads.map((thread) => thread.id)).toEqual([2]));
  });

  it("запис можна відредагувати — правка не створює нового", async () => {
    const { container } = render(<DeskPage />);
    await waitFor(() => expect(container.querySelectorAll(".desk-entry")).toHaveLength(2));

    fireEvent.click(screen.getAllByRole("button", { name: "Редагувати запис" })[0]);
    const body = screen.getByLabelText("Текст") as HTMLTextAreaElement;
    fireEvent.change(body, { target: { value: "Виправлений текст" } });
    fireEvent.click(screen.getByRole("button", { name: "Зберегти" }));

    await waitFor(() => expect(screen.getByText("Виправлений текст")).toBeTruthy());
    expect(state.entries).toHaveLength(2);
    expect(state.entries[0].body).toBe("Виправлений текст");
  });

  it("нова тема створюється й стає активною", async () => {
    render(<DeskPage />);
    await waitFor(() => expect(threadTitles()).toHaveLength(2));

    fireEvent.click(screen.getByRole("button", { name: "Нова тема" }));
    fireEvent.change(screen.getByLabelText("Назва"), {
      target: { value: "Борг за жовтень" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Зберегти" }));

    await waitFor(() => expect(threadTitles()).toContain("Борг за жовтень"));
  });
});
