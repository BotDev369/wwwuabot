/**
 * Перетворення «Стола»: дати, розміри, розкладка файлів по записах.
 *
 * @module web-admin-dev/src/pages/desk/desk-view.test
 */

import { describe, expect, it } from "vitest";
import type { DeskEntry, DeskFile, DeskThread } from "@wwwuabot/shared/desk/model";
import {
  countByGroup,
  formatBytes,
  formatWhen,
  lastEntryId,
  statusTone,
  toRoomView,
  toThreadView,
  turnTone,
} from "./desk-view";

const UNITS = { b: "B", kb: "KB", mb: "MB" };

const thread: DeskThread = {
  id: 7,
  group: "task",
  subgroup: "Зберігання",
  title: "R2",
  status: "open",
  turn: "buffy",
  tags: ["r2"],
  due_at: null,
  priority: 0,
  created_at: "2026-11-15 09:00:00",
  updated_at: "2026-11-15 09:00:00",
  last_entry_at: "2026-11-15 10:40:00",
  archived: false,
  entries: 2,
  unread: 3,
};

function entry(id: number, threadId = 7): DeskEntry {
  return {
    id,
    thread_id: threadId,
    author: "serhii",
    kind: "note",
    body: `запис ${id}`,
    meta: {},
    reply_to: null,
    created_at: "2026-11-15 10:40:00",
    edited_at: null,
  };
}

function file(id: number, entryId: number | null): DeskFile {
  return {
    id,
    thread_id: 7,
    entry_id: entryId,
    author: "serhii",
    name: `f${id}.txt`,
    mime: "text/plain",
    bytes: 2048,
    created_at: "2026-11-15 10:40:00",
  };
}

describe("desk-view", () => {
  it("дата стає «день.місяць година:хвилина», невідомий формат лишається", () => {
    expect(formatWhen("2026-11-15 10:40:00")).toBe("15.11 10:40");
    expect(formatWhen("колись")).toBe("колись");
  });

  it("розмір файлу — байти, кіло, мега з комою", () => {
    expect(formatBytes(512, UNITS)).toBe("512 B");
    expect(formatBytes(12_000, UNITS)).toBe("12 KB");
    expect(formatBytes(1_500_000, UNITS)).toBe("1,4 MB");
    expect(formatBytes(-1, UNITS)).toBe("0 B");
  });

  it("тон бейджа йде від статусу та ходу", () => {
    expect(statusTone("done")).toBe("wb-badge-green");
    expect(statusTone("doing")).toBe("wb-badge-accent");
    expect(statusTone("open")).toBe("wb-badge-neutral");
    expect(turnTone("buffy")).toBe("wb-badge-yellow");
    expect(turnTone("none")).toBe("wb-badge-neutral");
  });

  it("тема показує час останнього запису", () => {
    const view = toThreadView(thread);
    expect(view.updated).toBe("15.11 10:40");
    expect(view.unread).toBe(3);
  });

  it("файли розкладаються по записах, сирітські — окремо", () => {
    const room = toRoomView(
      { thread, entries: [entry(1), entry(2)], files: [file(10, 1), file(11, null)] },
      UNITS,
    );
    expect(room.entries[0].files.map((item) => item.name)).toEqual(["f10.txt"]);
    expect(room.entries[1].files).toEqual([]);
    expect(room.files.map((item) => item.name)).toEqual(["f11.txt"]);
    expect(room.entries[0].files[0].url).toContain("id=10");
  });

  it("лічильники груп і останній запис", () => {
    expect(countByGroup({ plan: 2, task: 1 })).toBe(3);
    expect(lastEntryId([entry(3), entry(9), entry(5)])).toBe(9);
    expect(lastEntryId([])).toBe(0);
  });
});
