/**
 * Репозиторій сценаріїв: точний пошук за `lookup`, розбір типу й запис стану.
 *
 * @module bot-dev/src/repositories/scenario.repository.test
 */

import { describe, expect, it } from "vitest";
import { ScenarioRepository } from "./scenario.repository";

function db(row: Record<string, unknown> | null) {
  const calls: { sql: string; args: unknown[] }[] = [];
  const database = {
    prepare(sql: string) {
      const call = { sql, args: [] as unknown[] };
      calls.push(call);
      const stmt = {
        bind(...args: unknown[]) {
          call.args = args;
          return stmt;
        },
        first: async () => row,
        run: async () => ({ meta: { changes: 1 } }),
      };
      return stmt;
    },
  } as unknown as D1Database;
  return { repo: new ScenarioRepository({ DB: database } as never), calls };
}

describe("findByLookup", () => {
  it("шукає точно й віддає тип", async () => {
    const { repo, calls } = db({
      id: 1,
      lookup: "/start",
      kind: "widget",
      widget_html: "<h1>x</h1>",
      widget_data: null,
      rich_html: null,
      notify_groups: null,
      notify_template: null,
    });

    const found = await repo.findByLookup("/start");
    expect(found?.kind).toBe("widget");
    expect(found?.lookup).toBe("/start");
    expect(calls[0].args).toEqual(["/start"]);
  });

  it("невідомий тип читається як widget, порожній рядок — null", async () => {
    const { repo } = db({
      id: 2,
      lookup: "x",
      kind: "???",
      widget_html: "<b>x</b>",
      widget_data: null,
      rich_html: null,
      notify_groups: null,
      notify_template: null,
    });
    expect((await repo.findByLookup("x"))?.kind).toBe("widget");

    const empty = db(null);
    expect(await empty.repo.findByLookup("nope")).toBeNull();
  });
});

describe("saveMessageState", () => {
  it("оновлює стан повідомлення за користувачем", async () => {
    const { repo, calls } = db(null);
    await repo.saveMessageState(7, 9, "w1", "/start", "{}");

    expect(calls[0].sql).toContain("INSERT INTO bot_widget_messages");
    expect(calls[0].sql).toContain("ON CONFLICT(user_id)");
    expect(calls[0].args).toEqual([7, 9, "w1", "/start", "{}"]);
  });
});
