import { describe, expect, it } from "vitest";
import type { ShopOrder } from "@wwwuabot/shared/shop";
import { attachBuyerProfiles, buyerProfileOf, orderSnapshots } from "./buyer-profiles";

const ORDER: ShopOrder = {
  id: 7,
  shopId: 1,
  buyerId: 777,
  status: "new",
  contact: {},
  note: "",
  sellerNote: "",
  items: [],
  createdAt: "",
  updatedAt: "",
};

function fakeDb(rows: { id: number; buyer_profile: string | null }[]): {
  db: D1Database;
  queries: string[];
} {
  const queries: string[] = [];
  const db = {
    prepare(sql: string) {
      queries.push(sql);
      const statement = {
        bind: () => statement,
        all: async () => ({ results: rows }),
      };
      return statement;
    },
  };
  return { db: db as unknown as D1Database, queries };
}

describe("buyerProfileOf", () => {
  it("читає знімок, зокрема прапорець швидкого замовлення", () => {
    expect(
      buyerProfileOf(
        JSON.stringify({
          name: "Олена",
          username: "olena",
          language: "uk",
          photo: "/api/shop/media/shop/avatars/1.jpg",
          quick: true,
        }),
      ),
    ).toEqual({
      name: "Олена",
      username: "olena",
      language: "uk",
      photo: "/api/shop/media/shop/avatars/1.jpg",
      quick: true,
    });
  });

  it("зіпсований JSON або порожнє ім'я — знімка немає", () => {
    expect(buyerProfileOf("{oops")).toBeNull();
    expect(buyerProfileOf(JSON.stringify({ username: "x" }))).toBeNull();
    expect(buyerProfileOf(null)).toBeNull();
  });
});

describe("orderSnapshots", () => {
  it("бере назву, ціну й вид із товару, а не з клієнта", () => {
    expect(
      orderSnapshots(
        [{ productId: 9, qty: 2 }],
        [{ id: 9, title: "Ромашка", price: "120 ₴", kind: "physical" }],
      ),
    ).toEqual([{ productId: 9, title: "Ромашка", price: "120 ₴", kind: "physical", qty: 2 }]);
  });

  it("невідомий товар лишає порожні поля, а не падає", () => {
    expect(orderSnapshots([{ productId: 5, qty: 1 }], [])).toEqual([
      { productId: 5, title: "", price: "", kind: "", qty: 1 },
    ]);
  });
});

describe("attachBuyerProfiles", () => {
  it("додає профіль тим замовленням, у яких він є", async () => {
    const { db, queries } = fakeDb([
      {
        id: 7,
        buyer_profile: JSON.stringify({ name: "Олена", username: "olena", quick: true }),
      },
    ]);

    const [order] = await attachBuyerProfiles(db, [ORDER]);
    expect(order.buyerProfile?.name).toBe("Олена");
    expect(queries[0]).toContain("buyer_profile");
  });

  it("збій запиту не валить список замовлень", async () => {
    const db = {
      prepare: () => ({ bind: () => ({ all: async () => Promise.reject(new Error("db down")) }) }),
    } as unknown as D1Database;

    expect(await attachBuyerProfiles(db, [ORDER])).toEqual([ORDER]);
  });

  it("порожній список не робить запиту", async () => {
    const { db, queries } = fakeDb([]);
    expect(await attachBuyerProfiles(db, [])).toEqual([]);
    expect(queries).toHaveLength(0);
  });
});
