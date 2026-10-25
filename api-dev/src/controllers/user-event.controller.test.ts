import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";
import { handleUserEvent } from "./user-event.controller";

const mocks = vi.hoisted(() => ({ identity: vi.fn() }));
vi.mock("../shared/identity", () => ({ tryResolveUserId: mocks.identity }));

function database() {
  const calls: { sql: string; values: unknown[] }[] = [];
  const db = {
    prepare(sql: string) {
      const call = { sql, values: [] as unknown[] };
      calls.push(call);
      const statement = {
        bind(...values: unknown[]) {
          call.values = values;
          return statement;
        },
        first: async () => null,
        all: async () => ({ results: [] }),
        run: async () => ({ meta: { changes: 1 } }),
      };
      return statement;
    },
  };
  return { calls, env: { DB: db } as unknown as Env };
}

const post = (body: unknown): Request =>
  new Request("https://example.com/api/user/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.identity.mockResolvedValue(777);
});

describe("подія від застосунку", () => {
  it("відкритий екран стає рядком журналу", async () => {
    const db = database();
    const response = await handleUserEvent(post({ screen: "trackers" }), db.env);

    expect(response.status).toBe(200);
    const insert = db.calls.find((call) => call.sql.startsWith("INSERT INTO user_events"));
    expect(insert?.values.slice(0, 5)).toEqual([777, "platform", "view", "trackers", null]);
  });

  it("вигаданий ключ екрана не пише нічого", async () => {
    const db = database();
    const response = await handleUserEvent(post({ screen: "/api/user/trackers" }), db.env);

    expect(response.status).toBe(400);
    expect(db.calls.some((call) => call.sql.startsWith("INSERT"))).toBe(false);
  });

  it("без підписаної людини — 401, а не подія від нікого", async () => {
    mocks.identity.mockResolvedValue(null);
    const db = database();
    const response = await handleUserEvent(post({ screen: "trackers" }), db.env);

    expect(response.status).toBe(401);
    expect(db.calls.some((call) => call.sql.startsWith("INSERT"))).toBe(false);
  });

  it("криве тіло — 400", async () => {
    const db = database();
    const response = await handleUserEvent(
      new Request("https://example.com/api/user/event", { method: "POST", body: "не json" }),
      db.env,
    );

    expect(response.status).toBe(400);
  });

  it("натискання пишеться назвою, а сторінка — місцем дії", async () => {
    const db = database();
    const response = await handleUserEvent(
      post({ kind: "click", screen: "page", page: "GalyaShop", label: "Солапанк" }),
      db.env,
    );

    expect(response.status).toBe(200);
    const insert = db.calls.find((call) => call.sql.startsWith("INSERT INTO user_events"));
    expect(insert?.values.slice(0, 5)).toEqual([777, "platform", "click", "Солапанк", "GalyaShop"]);
  });

  it("вибір у полі пише назву поля й місце дії окремо від значення", async () => {
    const db = database();
    const response = await handleUserEvent(
      post({
        kind: "input",
        screen: "trackers",
        page: "Трекери",
        label: "мл",
        field: "Одиниця",
      }),
      db.env,
    );

    expect(response.status).toBe(200);
    const insert = db.calls.find((call) => call.sql.startsWith("INSERT INTO user_events"));
    expect(insert?.values.slice(0, 5)).toEqual([
      777,
      "platform",
      "input",
      "мл",
      "Поле «Одиниця» · Трекери",
    ]);
  });

  it("порожня назва сторінки не відхиляє подію", async () => {
    const db = database();
    const response = await handleUserEvent(post({ screen: "page", title: null }), db.env);

    expect(response.status).toBe(200);
    const insert = db.calls.find((call) => call.sql.startsWith("INSERT INTO user_events"));
    expect(insert?.values.slice(0, 5)).toEqual([777, "platform", "view", "page", null]);
  });

  it("сторінка приходить із назвою з шапки, а не ключем розділу", async () => {
    const db = database();
    await handleUserEvent(post({ screen: "notes", title: "Кава вдома" }), db.env);

    const insert = db.calls.find((call) => call.sql.startsWith("INSERT INTO user_events"));
    expect(insert?.values.slice(0, 5)).toEqual([777, "platform", "view", "Кава вдома", null]);
  });

  it("модалка пише свою назву й сторінку, з якої її відкрили", async () => {
    const db = database();
    const response = await handleUserEvent(
      post({ kind: "modal", screen: "notes", title: "Створити" }),
      db.env,
    );

    expect(response.status).toBe(200);
    const insert = db.calls.find((call) => call.sql.startsWith("INSERT INTO user_events"));
    expect(insert?.values.slice(0, 5)).toEqual([777, "platform", "modal", "Створити", null]);
  });

  it("модалка без назви — 400: без назви це не подія", async () => {
    const db = database();
    const response = await handleUserEvent(post({ kind: "modal", screen: "notes" }), db.env);

    expect(response.status).toBe(400);
    expect(db.calls.some((call) => call.sql.startsWith("INSERT"))).toBe(false);
  });

  it("жест без назви — 400: рядок без підпису не пояснює нічого", async () => {
    const db = database();
    const response = await handleUserEvent(post({ kind: "click", screen: "trackers" }), db.env);

    expect(response.status).toBe(400);
    expect(db.calls.some((call) => call.sql.startsWith("INSERT"))).toBe(false);
  });

  it("дотик пишеться завжди — прапорця деталізації більше немає", async () => {
    const db = database();
    const click = await handleUserEvent(
      post({ kind: "click", screen: "trackers", label: "Додати" }),
      db.env,
    );

    expect(click.status).toBe(200);
    const insert = db.calls.find((call) => call.sql.startsWith("INSERT INTO user_events"));
    expect(insert?.values.slice(0, 5)).toEqual([777, "platform", "click", "Додати", null]);
  });

  it("збій запису не ламає навігацію", async () => {
    const env = {
      DB: {
        prepare() {
          throw new Error("D1 недоступна");
        },
      },
    } as unknown as Env;

    const response = await handleUserEvent(post({ screen: "trackers" }), env);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: false });
  });
});
