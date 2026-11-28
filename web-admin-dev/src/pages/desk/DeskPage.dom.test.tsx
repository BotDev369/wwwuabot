// @vitest-environment jsdom
/**
 * «Стіл» на живих даних: таблиця, модалка справи, композер. Мережа —
 * підмінений `desk.api` зі сховищем у пам'яті: перевіряємо, що сторінка
 * правильно читає відповіді й надсилає потрібне.
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
  queries: [] as Array<Record<string, unknown>>,
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
    fetchDeskThreads: async (query: Record<string, unknown> = {}) => {
      state.queries.push(query);
      const archivedOnly = query.archived === "only";
      const list = state.threads.filter((thread) => {
        if (archivedOnly ? !thread.archived : thread.archived) return false;
        if (query.turn && query.turn !== "all" && thread.turn !== query.turn) return false;
        return true;
      });
      return { ok: true, threads: list, counts: {}, total: list.length };
    },
    fetchDeskThread: async (id: number) => readRoom(id),
    saveDeskThread: async (input: Record<string, unknown>) => {
      const id = Number(input.id);
      const existing = state.threads.find((thread) => thread.id === id);
      if (existing) {
        if (input.title !== undefined) existing.title = String(input.title);
        if (input.turn !== undefined) existing.turn = String(input.turn);
        if (input.status !== undefined) existing.status = String(input.status);
        if (input.archived === true) existing.archived = true;
        if (input.archived === false) existing.archived = false;
        return readRoom(existing.id);
      }
      const created = {
        ...(state.threads[0] as DeskThread),
        id: 99,
        title: String(input.title),
        turn: String(input.turn),
        status: String(input.status),
        archived: false,
        entries: 0,
        unread: 0,
      } as DeskThread;
      state.threads.push(created);
      return readRoom(created.id);
    },
    addDeskEntry: async (input: Record<string, unknown>) => {
      const threadId = Number(input.thread_id);
      const editing = state.entries.find((entry) => entry.id === Number(input.id));
      if (editing) {
        editing.body = String(input.body);
        return readRoom(threadId);
      }
      state.entries.push({
        id: (state.entries[state.entries.length - 1]?.id ?? 100) + 1,
        thread_id: threadId,
        author: "serhii" as DeskSide,
        kind: "note",
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
    markDeskRead: async (threadId: number, entryId: number) => {
      state.read.push([threadId, entryId]);
      return { ok: true };
    },
    uploadDeskFile: async (threadId: number, entryId: number, file: File) => {
      state.files.push({
        id: 500 + state.files.length,
        thread_id: threadId,
        entry_id: entryId,
        name: file.name,
        bytes: file.size,
        mime: "application/octet-stream",
        author: "serhii" as DeskSide,
        created_at: "2026-11-15 11:00:00",
      } as DeskFile);
      return readRoom(threadId);
    },
  };
});

import { DeskPage } from "./DeskPage";

function thread(id: number, patch: Partial<DeskThread> = {}): DeskThread {
  return {
    id,
    group: "task",
    subgroup: "",
    title: `Справа ${id}`,
    status: "open",
    turn: "serhii",
    tags: [],
    due_at: null,
    priority: 2,
    created_at: "2026-11-15 10:00:00",
    updated_at: "2026-11-15 10:00:00",
    last_entry_at: "2026-11-15 10:00:00",
    archived: false,
    entries: 0,
    unread: 0,
    ...patch,
  };
}

function entry(id: number, patch: Partial<DeskEntry> = {}): DeskEntry {
  return {
    id,
    thread_id: 1,
    author: "serhii",
    kind: "note",
    body: `Запис ${id}`,
    meta: {},
    reply_to: null,
    created_at: "2026-11-15 10:00:00",
    edited_at: null,
    ...patch,
  };
}

function render(ui: React.ReactElement) {
  return renderRaw(<DialogProvider>{ui}</DialogProvider>);
}

const rows = () =>
  [...document.querySelectorAll(".wb-table tbody tr")].map((row) => row.textContent);

beforeEach(() => {
  localStorage.clear();
  state.threads = [
    thread(1, { title: "Файли: стеля 20 МБ", turn: "serhii", unread: 1 }),
    thread(2, { title: "Хто пише першим", turn: "buffy", status: "doing" }),
  ];
  state.entries = [entry(11, { body: "Перший запис справи" })];
  state.files = [];
  state.read = [];
  state.queries = [];
});

describe("Стіл: список", () => {
  it("показує справи таблицею, як решта адмінки", async () => {
    render(<DeskPage />);
    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(rows()[0]).toContain("Файли: стеля 20 МБ");
    expect(rows()[0]).toContain("Сергій");
    expect(rows()[1]).toContain("Фрібаф");
  });

  it("порожній список каже причину", async () => {
    state.threads = [];
    render(<DeskPage />);
    await waitFor(() => expect(screen.getByText("Справ поки немає")).toBeTruthy());
  });

  it("фільтр черги питає сервер", async () => {
    render(<DeskPage />);
    await waitFor(() => expect(rows()).toHaveLength(2));

    fireEvent.change(screen.getByLabelText("Фільтр черги"), {
      target: { value: "buffy" },
    });

    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(state.queries[state.queries.length - 1]).toMatchObject({ turn: "buffy" });
  });

  it("вибір черги й архіву переживає перемонтування екрана", async () => {
    const first = render(<DeskPage />);
    await waitFor(() => expect(rows()).toHaveLength(2));

    fireEvent.change(screen.getByLabelText("Фільтр архіву"), { target: { value: "only" } });
    await waitFor(() => expect(screen.getByText("В архіві порожньо")).toBeTruthy());
    first.unmount();

    render(<DeskPage />);
    expect((screen.getByLabelText("Фільтр архіву") as HTMLSelectElement).value).toBe("only");
    await waitFor(() =>
      expect(state.queries[state.queries.length - 1]).toMatchObject({ archived: "only" }),
    );
  });
});

describe("Стіл: справа", () => {
  it("рядок відкриває справу й позначає вичитаним до останнього запису", async () => {
    render(<DeskPage />);
    await waitFor(() => expect(rows()).toHaveLength(2));

    fireEvent.click(screen.getByText("Файли: стеля 20 МБ"));

    expect(await screen.findByText("Перший запис справи")).toBeTruthy();
    await waitFor(() => expect(state.read[0]).toEqual([1, 11]));
  });

  it("«+» створює справу з назвою й чергою", async () => {
    render(<DeskPage />);
    await waitFor(() => expect(rows()).toHaveLength(2));

    fireEvent.click(screen.getByRole("button", { name: "Нова справа" }));
    fireEvent.change(await screen.findByLabelText("Назва"), {
      target: { value: "Борг за жовтень" },
    });
    fireEvent.change(screen.getByLabelText("Чия черга"), { target: { value: "buffy" } });
    fireEvent.click(screen.getByRole("button", { name: "Зберегти" }));

    await waitFor(() => expect(screen.getByText("Борг за жовтень")).toBeTruthy());
    expect(state.threads[state.threads.length - 1]).toMatchObject({
      title: "Борг за жовтень",
      turn: "buffy",
    });
  });

  it("справу можна відредагувати", async () => {
    render(<DeskPage />);
    await waitFor(() => expect(rows()).toHaveLength(2));

    fireEvent.click(screen.getByText("Файли: стеля 20 МБ"));
    fireEvent.click(await screen.findByRole("button", { name: "Редагувати" }));
    const title = screen.getByLabelText("Назва") as HTMLInputElement;
    expect(title.value).toBe("Файли: стеля 20 МБ");
    fireEvent.change(title, { target: { value: "Стеля 20 МБ — вирішено" } });
    fireEvent.click(screen.getByRole("button", { name: "Зберегти" }));

    await waitFor(() => expect(state.threads[0].title).toBe("Стеля 20 МБ — вирішено"));
  });

  it("справу можна сховати в архів і повернути", async () => {
    render(<DeskPage />);
    await waitFor(() => expect(rows()).toHaveLength(2));

    fireEvent.click(screen.getByText("Файли: стеля 20 МБ"));
    fireEvent.click(await screen.findByRole("button", { name: "В архів" }));

    await waitFor(() => expect(state.threads[0].archived).toBe(true));
    fireEvent.change(screen.getByLabelText("Фільтр архіву"), { target: { value: "only" } });
    await waitFor(() => expect(rows()).toHaveLength(1));
  });

  it("справу можна видалити — з підтвердженням", async () => {
    render(<DeskPage />);
    await waitFor(() => expect(rows()).toHaveLength(2));

    fireEvent.click(screen.getByText("Файли: стеля 20 МБ"));
    fireEvent.click(await screen.findByRole("button", { name: "Видалити" }));
    const confirm = await screen.findAllByRole("button", { name: "Видалити" });
    fireEvent.click(confirm[confirm.length - 1]);

    await waitFor(() => expect(state.threads.map((item) => item.id)).toEqual([2]));
  });
});

describe("Стіл: записи", () => {
  it("композер додає запис, а Cmd+Enter надсилає", async () => {
    render(<DeskPage />);
    await waitFor(() => expect(rows()).toHaveLength(2));
    fireEvent.click(screen.getByText("Файли: стеля 20 МБ"));

    const input = await screen.findByLabelText("Написати в справу");
    fireEvent.change(input, { target: { value: "  Перевірка  " } });
    fireEvent.keyDown(input, { key: "Enter", metaKey: true });

    await waitFor(() => expect(screen.getByText("Перевірка")).toBeTruthy());
    expect(state.entries[state.entries.length - 1]?.body).toBe("Перевірка");
    expect((input as HTMLTextAreaElement).value).toBe("");
  });

  it("запис можна відредагувати — правка не створює нового", async () => {
    render(<DeskPage />);
    await waitFor(() => expect(rows()).toHaveLength(2));
    fireEvent.click(screen.getByText("Файли: стеля 20 МБ"));

    fireEvent.click(await screen.findByRole("button", { name: "Редагувати запис" }));
    fireEvent.change(screen.getByLabelText("Текст"), { target: { value: "Виправлено" } });
    fireEvent.click(screen.getByRole("button", { name: "Зберегти" }));

    await waitFor(() => expect(screen.getByText("Виправлено")).toBeTruthy());
    expect(state.entries).toHaveLength(1);
  });

  it("запис можна видалити — з підтвердженням", async () => {
    render(<DeskPage />);
    await waitFor(() => expect(rows()).toHaveLength(2));
    fireEvent.click(screen.getByText("Файли: стеля 20 МБ"));

    fireEvent.click(await screen.findByRole("button", { name: "Видалити запис" }));
    const buttons = await screen.findAllByRole("button", { name: "Видалити" });
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => expect(state.entries).toHaveLength(0));
  });
});

describe("Стіл: файли", () => {
  it("файл запису видно й можна прибрати — з підтвердженням", async () => {
    state.files = [
      {
        id: 501,
        thread_id: 1,
        entry_id: 11,
        author: "serhii",
        name: "стеля.txt",
        bytes: 2048,
        mime: "text/plain",
        created_at: "2026-11-15 10:00:00",
      },
    ];
    render(<DeskPage />);
    await waitFor(() => expect(rows()).toHaveLength(2));
    fireEvent.click(screen.getByText("Файли: стеля 20 МБ"));

    expect(await screen.findByText("стеля.txt")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Видалити файл: стеля.txt" }));
    const confirm = await screen.findAllByRole("button", { name: "Видалити" });
    fireEvent.click(confirm[confirm.length - 1]);

    await waitFor(() => expect(state.files).toHaveLength(0));
  });

  it("прикріплений файл іде в новий запис", async () => {
    render(<DeskPage />);
    await waitFor(() => expect(rows()).toHaveLength(2));
    fireEvent.click(screen.getByText("Файли: стеля 20 МБ"));

    const input = (await screen.findByLabelText("Написати в справу"))
      .closest(".desk-composer")!
      .querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["дані"], "звіт.txt", { type: "text/plain" });
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByText("звіт.txt")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Написати в справу"), { target: { value: "звіт" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Надіслати" }).pop()!);

    await waitFor(() => expect(state.files.map((item) => item.name)).toEqual(["звіт.txt"]));
    expect(state.files[0].entry_id).toBe(state.entries[state.entries.length - 1].id);
  });
});
