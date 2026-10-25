/**
 * Позначка про замовлення в розмові — те, що бачить продавець.
 *
 * Перевіряються три речі, кожна з яких ламається мовчки:
 *
 * 1. **Пише система, а не покупець**: `sender_id` — `SYSTEM_SENDER_ID`, і
 *    `is_system = 1`; інакше позначка виглядала б як повідомлення покупця, і
 *    відповідь на неї пішла б не туди.
 * 2. **Розмова вертається обом**: прапорці приховування знімає сама позначка —
 *    інакше прибрана розмова лишалась би прибраною, і замовлення не мав би де
 *    побачити ніхто (див. `listConversations`).
 * 3. **Копії останку немає**: список читає найновіший рядок `messages`, тож
 *    окремого `last_message_*` тут писати нічого — і писати його означало б
 *    завести друге сховище того самого факту.
 *
 * D1 — фейковий: перевіряються рішення сервісу, а не сервер SQLite.
 *
 * @module api-dev/src/services/shop/orders-notice.test
 */

import { describe, expect, it } from "vitest";
import { SYSTEM_SENDER_ID } from "@wwwuabot/shared/messages";
import type { ShopOrder } from "@wwwuabot/shared/shop";
import { notifyOrder } from "./orders-notice";
import type { ShopScope } from "./shops";

const OWNER = 372567448;
const ADMIN = 1049272067;
const BUYER = 6281898553;

interface Captured {
  sql: string;
  binds: unknown[];
}

function shop(overrides: Partial<ShopScope> = {}): ShopScope {
  return {
    id: 382,
    slug: "galyashop",
    ownerId: OWNER,
    adminIds: [ADMIN],
    title: "GalyaShop",
    ...overrides,
  };
}

function order(overrides: Partial<ShopOrder> = {}): ShopOrder {
  return {
    id: 7,
    shopId: 382,
    buyerId: BUYER,
    status: "new",
    contact: { name: "Олена", phone: "111" },
    note: "",
    sellerNote: "",
    items: [{ productId: 1, title: "Безсмертник", price: "120", kind: "physical", qty: 1 }],
    createdAt: "2026-10-25 10:00:00",
    updatedAt: "2026-10-25 10:00:00",
    ...overrides,
  };
}

/** Заглушка D1: розмова вже існує (`id = 5`), а `batch` лише збирає запити. */
function makeDb(options: { conversationId?: number | null } = {}): {
  db: D1Database;
  statements: Captured[];
  batches: Captured[][];
} {
  const statements: Captured[] = [];
  const batches: Captured[][] = [];
  /** `batch` отримує самі statement'и, тож зв'язок із записом — за тотожністю. */
  const byStatement = new Map<object, Captured>();
  const conversationId = options.conversationId === undefined ? 5 : options.conversationId;

  const db = {
    prepare(sql: string) {
      const record: Captured = { sql, binds: [] };
      statements.push(record);
      const statement = {
        bind: (...args: unknown[]) => {
          record.binds = args;
          return statement;
        },
        first: async () => (conversationId === null ? null : { id: conversationId }),
        all: async () => ({ results: [] }),
        run: async () => ({ meta: { changes: 1, last_row_id: conversationId } }),
      };
      byStatement.set(statement, record);
      return statement;
    },
    batch: async (prepared: unknown[]) => {
      batches.push(
        prepared.map((item) => byStatement.get(item as object) ?? { sql: "", binds: [] }),
      );
      return [];
    },
  };

  return { db: db as unknown as D1Database, statements, batches };
}

describe("позначка про замовлення", () => {
  it("пише системний рядок і вертає розмову обом", async () => {
    const { db, batches } = makeDb();
    await notifyOrder(db, shop(), BUYER, order());

    const [fromOwner, fromAdmin] = batches;
    expect(batches).toHaveLength(2);

    const insert = fromOwner.find((s) => /INSERT INTO messages/.test(s.sql));
    expect(insert?.binds.slice(0, 2)).toEqual([5, SYSTEM_SENDER_ID]);
    expect(String(insert?.binds[2])).toContain("GalyaShop");

    const unhide = fromOwner.find((s) => /UPDATE conversations/.test(s.sql));
    expect(unhide?.sql).toBe("UPDATE conversations SET hidden_a = 0, hidden_b = 0 WHERE id = ?");
    expect(unhide?.binds).toEqual([5]);

    // Кожен, хто веде магазин, отримує власну розмову з покупцем.
    expect(fromAdmin).toHaveLength(fromOwner.length);
  });

  it("копії останку не пише — список читає `messages`", async () => {
    const { db, statements } = makeDb();
    await notifyOrder(db, shop(), BUYER, order());

    expect(statements.some((s) => /last_message/.test(s.sql))).toBe(false);
  });

  it("той, хто веде магазин, не пише сам собі", async () => {
    const { db, batches } = makeDb();
    await notifyOrder(db, shop(), OWNER, order({ buyerId: OWNER }));

    // Лишається тільки адмін: із собою покупцеві говорити нема чого.
    expect(batches).toHaveLength(1);
  });

  it("розмови не вдалося відкрити — жодного запису й жодного падіння", async () => {
    const { db, batches } = makeDb({ conversationId: null });
    await notifyOrder(db, shop(), BUYER, order());

    expect(batches).toHaveLength(0);
  });

  it("порожній список тих, хто веде магазин, — тихий вихід", async () => {
    const { db, statements } = makeDb();
    await notifyOrder(db, shop({ ownerId: BUYER, adminIds: [] }), BUYER, order());

    expect(statements).toHaveLength(0);
  });
});
