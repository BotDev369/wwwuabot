import { describe, it, expect } from "vitest";
import { createSite, deleteSite, getSiteBySlug, getSitesByOwner, updateSite } from "./crud";
import { createFakeDb, siteRow } from "./fake-db";
import { DEFAULT_SITE_SETTINGS } from "@wwwuabot/shared/constants/site-defaults";

/**
 * Тести CRUD сайтів.
 *
 * Два місця, за які вони відповідають (обидва колись були б тихою втратою):
 *
 * 1. **Головна сторінка** створюється разом із сайтом: без неї сайт не
 *    відкривається, а користувач бачить порожній редактор.
 * 2. **`updateSite` не вміє змінювати статус.** Публікація — це модерація, а не
 *    оновлення полів; якби статус був серед оновлюваних колонок, сайт можна було
 *    б опублікувати повз чергу.
 *
 * @module api-dev/src/services/sites/crud.test
 */

describe("createSite", () => {
  it("створює сайт разом із порожньою головною сторінкою", async () => {
    const fake = createFakeDb(() => ({}));

    const site = await createSite(fake.db, { slug: "my-site", title: "Мій сайт", ownerId: 42 });

    const siteInsert = fake.writes.find((w) => w.sql.startsWith("INSERT INTO sites"));
    expect(siteInsert?.bindings[1]).toBe("my-site");
    expect(siteInsert?.bindings[4]).toBe(42); // owner_id
    expect(siteInsert?.bindings[6]).toBe(JSON.stringify(DEFAULT_SITE_SETTINGS));
    expect(siteInsert?.bindings[7]).toBe(0); // is_public за замовчуванням — ні

    const pageInsert = fake.writes.find((w) => w.sql.startsWith("INSERT INTO site_pages"));
    expect(pageInsert?.sql).toContain("'home'");
    expect(pageInsert?.bindings[1]).toBe(site.id);

    expect(site.status).toBe("draft");
    expect(site.isPublic).toBe(false);
    expect(site.createdAt).toBe(site.updatedAt);
  });

  it("позначає публічний сайт у колонці is_public", async () => {
    const fake = createFakeDb(() => ({}));

    const site = await createSite(fake.db, {
      slug: "my-site",
      title: "Мій сайт",
      ownerId: 42,
      isPublic: true,
    });

    const siteInsert = fake.writes.find((w) => w.sql.startsWith("INSERT INTO sites"));
    expect(siteInsert?.bindings[7]).toBe(1);
    expect(site.isPublic).toBe(true);
  });
});

describe("getSiteBySlug", () => {
  it("розпаковує JSON-колонки й булеві прапори", async () => {
    const fake = createFakeDb(() =>
      siteRow({ settings: '{"theme":"dark"}', is_public: 1, description: null }),
    );

    const site = await getSiteBySlug(fake.db, "my-site");

    expect(site?.settings).toEqual({ theme: "dark" });
    expect(site?.isPublic).toBe(true);
    expect(site?.description).toBeUndefined();
  });

  it("не падає на битій JSON-колонці", async () => {
    const fake = createFakeDb(() => siteRow({ settings: "{ це не JSON" }));

    await expect(getSiteBySlug(fake.db, "my-site")).resolves.toMatchObject({ settings: {} });
  });

  it("повертає null для невідомого slug і нічого не пише", async () => {
    const fake = createFakeDb(() => null);

    await expect(getSiteBySlug(fake.db, "no-such-site")).resolves.toBeNull();
    expect(fake.writes).toHaveLength(0);
  });
});

describe("getSitesByOwner", () => {
  it("вибирає сайти власника, найновіші першими", async () => {
    const fake = createFakeDb(() => ({ results: [siteRow({ owner_id: 5 })] }));

    const sites = await getSitesByOwner(fake.db, 5);

    expect(fake.reads[0].sql).toContain("WHERE owner_id = ? ORDER BY updated_at DESC");
    expect(fake.reads[0].bindings).toEqual([5]);
    expect(sites).toHaveLength(1);
  });
});

describe("updateSite", () => {
  it("оновлює лише передані поля й жодного разу не чіпає status", async () => {
    const fake = createFakeDb((sql) =>
      sql.startsWith("SELECT * FROM sites WHERE slug = ?") ? siteRow() : {},
    );

    await updateSite(fake.db, "my-site", { title: "Нова назва", isPublic: true });

    const update = fake.writes.find((w) => w.sql.startsWith("UPDATE sites SET"));
    expect(update?.sql).toContain("title = ?");
    expect(update?.sql).toContain("is_public = ?");
    expect(update?.sql).toContain("updated_at = ?");
    expect(update?.sql).not.toContain("status");
    expect(update?.bindings).toEqual(["Нова назва", 1, expect.any(String), "my-site"]);
  });

  it("серіалізує settings у JSON", async () => {
    const fake = createFakeDb((sql) =>
      sql.startsWith("SELECT * FROM sites WHERE slug = ?") ? siteRow() : {},
    );

    await updateSite(fake.db, "my-site", { settings: { theme: "dark" } });

    const update = fake.writes.find((w) => w.sql.startsWith("UPDATE sites SET"));
    expect(update?.bindings[0]).toBe('{"theme":"dark"}');
  });

  it("не пише в базу, якщо оновлювати нічого", async () => {
    const fake = createFakeDb((sql) =>
      sql.startsWith("SELECT * FROM sites WHERE slug = ?") ? siteRow() : {},
    );

    const site = await updateSite(fake.db, "my-site", {});

    expect(site?.slug).toBe("my-site");
    expect(fake.writes).toHaveLength(0);
  });

  it("повертає null для невідомого slug", async () => {
    const fake = createFakeDb(() => null);

    await expect(updateSite(fake.db, "no-such-site", { title: "X" })).resolves.toBeNull();
    expect(fake.writes).toHaveLength(0);
  });
});

describe("deleteSite", () => {
  it("спершу видаляє сторінки, потім сайт", async () => {
    const fake = createFakeDb((sql) => {
      if (sql.startsWith("SELECT * FROM sites WHERE slug = ?")) return siteRow();
      if (sql.startsWith("DELETE FROM sites")) return { meta: { changes: 1 } };
      return {};
    });

    const deleted = await deleteSite(fake.db, "my-site");

    expect(deleted).toBe(true);
    expect(fake.writes.map((w) => w.sql)).toEqual([
      "DELETE FROM site_pages WHERE site_id = ?",
      "DELETE FROM sites WHERE slug = ?",
    ]);
    expect(fake.writes[0].bindings).toEqual(["site-1"]);
  });

  it("⛔ не видаляє нічого для невідомого slug", async () => {
    const fake = createFakeDb(() => null);

    await expect(deleteSite(fake.db, "no-such-site")).resolves.toBe(false);
    expect(fake.writes).toHaveLength(0);
  });

  it("повертає false, якщо D1 не змінив жодного рядка", async () => {
    const fake = createFakeDb((sql) =>
      sql.startsWith("SELECT * FROM sites WHERE slug = ?") ? siteRow() : { meta: { changes: 0 } },
    );

    await expect(deleteSite(fake.db, "my-site")).resolves.toBe(false);
  });
});
