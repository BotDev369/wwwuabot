/**
 * Кому можна писати: зв'язок через контакти, через замовлення й напрямок
 * запрошення.
 *
 * Тут три правила, які ламаються мовчки й означають витік чужої переписки:
 *
 * 1. **Зв'язок симетричний, запрошення — ні.** Лінк складає один, а пише потім
 *    кожен: читати його лише як «мій контакт — це він» означало б, що людина, яка
 *    прийшла за чужим лінком, не може відповісти тому, хто її запросив.
 * 2. **Зв'язок — із кожним, хто веде магазин.** Замовлення зв'язує покупця з
 *    продавцем **і з адмінами** сторінки: питати можна того, хто відповів, а не
 *    лише того, хто створив сторінку. Роль вирішує `isPageManager`, бо адміни
 *    лежать JSON-ом і в `WHERE` їх не висловити.
 * 3. **Переписка із собою — не розмова.** Той самий `id` на обох кінцях дав би
 *    рядок, у якому неможливо відрізнити своє від чужого.
 *
 * D1 — фейковий: перевіряється рішення сервісу, а не сервер SQLite.
 *
 * @module api-dev/src/services/messages/links.test
 */

import { describe, expect, it } from "vitest";

import { areLinked, isInvitedBy } from "./links";

interface Captured {
  sql: string;
  binds: unknown[];
}

interface ShopOrderRow {
  buyer_id: number;
  owner_id: string | number | null;
  admin_ids: string | null;
}

/** Контакти як `(owner_id, joined_user_id)`; замовлення — рядками магазину. */
function makeDb(options: { contacts?: [number, number][]; orders?: ShopOrderRow[] }): {
  db: D1Database;
  statements: Captured[];
} {
  const contacts = options.contacts ?? [];
  const orders = options.orders ?? [];
  const statements: Captured[] = [];

  const db = {
    prepare(sql: string) {
      const record: Captured = { sql, binds: [] };
      statements.push(record);
      const statement = {
        bind: (...args: unknown[]) => {
          record.binds = args;
          return statement;
        },
        first: async () => {
          const [a, b, c, d] = record.binds;
          // `areLinked` питає обидва боки (чотири зв'язки), `isInvitedBy` — лише у
          // напрямку запрошення, тож напрямок задають самі зв'язки.
          const hit = contacts.some(
            ([owner, joined]) => (owner === a && joined === b) || (owner === c && joined === d),
          );
          return hit ? { id: 1 } : null;
        },
        all: async () => ({ results: orders }),
        run: async () => ({ meta: { changes: 0 } }),
      };
      return statement;
    },
  };

  return { db: db as unknown as D1Database, statements };
}

/** Чи бачив сервер замовлення: без нього зв'язок міг узятися з контактів. */
function askedAboutOrders(statements: Captured[]): boolean {
  return statements.some((statement) => /FROM shop_orders/.test(statement.sql));
}

describe("зв'язок через контакти", () => {
  it("символічний: зв'язані в будь-якому напрямку", async () => {
    const forward = makeDb({ contacts: [[1, 2]] });
    expect(await areLinked(forward.db, 1, 2)).toBe(true);

    const backward = makeDb({ contacts: [[1, 2]] });
    expect(await areLinked(backward.db, 2, 1)).toBe(true);
  });

  it("запит питає обидва боки, а не лише «мій контакт — це він»", async () => {
    const { db, statements } = makeDb({ contacts: [[1, 2]] });
    await areLinked(db, 2, 1);

    const first = statements[0];
    expect(first.sql).toContain("owner_id = ? AND joined_user_id = ?");
    expect(first.binds).toEqual([2, 1, 1, 2]);
  });

  it("переписка із собою — не зв'язок, і базу воно навіть не питає", async () => {
    const { db, statements } = makeDb({ contacts: [[7, 7]] });
    expect(await areLinked(db, 7, 7)).toBe(false);
    expect(statements).toHaveLength(0);
  });

  it("чужа людина — не зв'язок", async () => {
    const { db } = makeDb({ contacts: [[1, 2]] });
    expect(await areLinked(db, 1, 3)).toBe(false);
  });
});

describe("зв'язок через замовлення", () => {
  it("покупець зв'язаний із продавцем у будь-якому напрямку", async () => {
    const shop = { buyer_id: 2, owner_id: 5, admin_ids: null };
    const buyerSide = makeDb({ orders: [shop] });
    expect(await areLinked(buyerSide.db, 2, 5)).toBe(true);

    const sellerSide = makeDb({ orders: [shop] });
    expect(await areLinked(sellerSide.db, 5, 2)).toBe(true);
  });

  it("зв'язок є й з адміном магазину, а не лише з власником", async () => {
    const { db } = makeDb({
      orders: [{ buyer_id: 2, owner_id: 5, admin_ids: "[9]" }],
    });
    expect(await areLinked(db, 2, 9)).toBe(true);
  });

  it("купив у магазині, але сторінку веде третя людина — зв'язку немає", async () => {
    const { db } = makeDb({
      orders: [{ buyer_id: 2, owner_id: 5, admin_ids: "[9]" }],
    });
    expect(await areLinked(db, 2, 7)).toBe(false);
  });

  it("замовлення — другий бік, а не окремий випадок у надсиланні", async () => {
    const { db, statements } = makeDb({
      orders: [{ buyer_id: 2, owner_id: 5, admin_ids: null }],
    });
    await areLinked(db, 2, 5);

    expect(askedAboutOrders(statements)).toBe(true);
  });

  it("замовлень немає — це не помилка, а просто відсутність зв'язку", async () => {
    const { db } = makeDb({ orders: [] });
    expect(await areLinked(db, 2, 5)).toBe(false);
  });
});

describe("напрямок запрошення", () => {
  it("вітаємо того, хто прийшов за лінком, а не того, хто його дав", async () => {
    const joined = makeDb({ contacts: [[5, 2]] });
    expect(await isInvitedBy(joined.db, 2, 5)).toBe(true);

    const inviter = makeDb({ contacts: [[5, 2]] });
    expect(await isInvitedBy(inviter.db, 5, 2)).toBe(false);
  });

  it("собі — не запрошення", async () => {
    const { db, statements } = makeDb({ contacts: [[7, 7]] });
    expect(await isInvitedBy(db, 7, 7)).toBe(false);
    expect(statements).toHaveLength(0);
  });
});
