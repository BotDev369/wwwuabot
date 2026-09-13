import { describe, it, expect } from "vitest";
import {
  createSitePage,
  deleteSitePage,
  getSitePageById,
  getSitePages,
  updateSitePage,
} from "./pages";
import { createFakeDb, pageRow } from "./fake-db";

/**
 * Тести CRUD сторінок сайту.
 *
 * Ключова деталь домену: публікація сторінки — це не лише `status`, а й
 * `published_at`. Сторінка зі статусом `published` і порожньою датою публікації
 * ламає сортування каталогу й «останнє оновлення» в редакторі, тому обидві
 * колонки пишуться одним запитом.
 *
 * @module api-dev/src/services/sites/pages.test
 */

/** Двійник, який на читання віддає переданий рядок, а на будь-яку зміну — «1 рядок». */
function pageStore(row = pageRow()) {
  return createFakeDb((sql) =>
    sql.startsWith("SELECT * FROM site_pages WHERE id = ?") ? row : {},
  );
}

describe("createSitePage", () => {
  it("створює чернетку з порожньою Page Builder-розкладкою за замовчуванням", async () => {
    const fake = createFakeDb(() => ({}));

    const page = await createSitePage(fake.db, "site-1", { slug: "about", title: "Про нас" });

    const insert = fake.writes[0];
    expect(insert.sql).toContain("INSERT INTO site_pages");
    expect(JSON.parse(String(insert.bindings[4]))).toEqual({
      version: 1,
      zones: { sidebar: [], header: [], main: [], footer: [] },
    });
    expect(insert.bindings[1]).toBe("site-1");
    expect(insert.bindings[5]).toBe(0); // order_index
    expect(page.status).toBe("draft");
    expect(page.siteId).toBe("site-1");
  });

  it("зберігає передану розкладку, порядок і мету", async () => {
    const fake = createFakeDb(() => ({}));
    const pageData = {
      version: 1,
      zones: { sidebar: [], header: [], main: [{ id: "b1" }], footer: [] },
    };

    await createSitePage(fake.db, "site-1", {
      slug: "pricing",
      title: "Ціни",
      pageData,
      orderIndex: 3,
      meta: { description: "Тарифи" },
    });

    const insert = fake.writes[0];
    expect(JSON.parse(String(insert.bindings[4]))).toEqual(pageData);
    expect(insert.bindings[5]).toBe(3);
    expect(JSON.parse(String(insert.bindings[6]))).toEqual({ description: "Тарифи" });
  });
});

describe("читання сторінок", () => {
  it("getSitePages віддає сторінки в порядку order_index", async () => {
    const fake = createFakeDb(() => ({ results: [pageRow(), pageRow({ id: "page-2" })] }));

    const pages = await getSitePages(fake.db, "site-1");

    expect(fake.reads[0].sql).toContain("WHERE site_id = ? ORDER BY order_index ASC");
    expect(pages).toHaveLength(2);
    expect(pages[0].pageData).toEqual({
      version: 1,
      zones: { sidebar: [], header: [], main: [], footer: [] },
    });
  });

  it("getSitePageById повертає null, коли сторінки немає", async () => {
    const fake = createFakeDb(() => null);

    await expect(getSitePageById(fake.db, "no-such-page")).resolves.toBeNull();
    expect(fake.writes).toHaveLength(0);
  });
});

describe("updateSitePage", () => {
  it("при публікації проставляє published_at", async () => {
    const fake = pageStore();

    await updateSitePage(fake.db, "page-1", { status: "published" });

    const update = fake.writes[0];
    expect(update.sql).toContain("status = ?");
    expect(update.sql).toContain("published_at = ?");
    expect(update.bindings.slice(0, 2)).toEqual(["published", expect.any(String)]);
  });

  it("не чіпає published_at, коли сторінка лишається чернеткою", async () => {
    const fake = pageStore();

    await updateSitePage(fake.db, "page-1", { title: "Нова назва" });

    expect(fake.writes[0].sql).not.toContain("published_at");
  });

  it("оновлює лише передані поля", async () => {
    const fake = pageStore();

    await updateSitePage(fake.db, "page-1", { slug: "pricing", orderIndex: 2 });

    const update = fake.writes[0];
    expect(update.sql).toBe(
      "UPDATE site_pages SET slug = ?, order_index = ?, updated_at = ? WHERE id = ?",
    );
    expect(update.bindings).toEqual(["pricing", 2, expect.any(String), "page-1"]);
  });

  it("не пише в базу, якщо оновлювати нічого", async () => {
    const fake = pageStore();

    const page = await updateSitePage(fake.db, "page-1", {});

    expect(page?.id).toBe("page-1");
    expect(fake.writes).toHaveLength(0);
  });

  it("повертає null для невідомої сторінки", async () => {
    const fake = createFakeDb(() => null);

    await expect(updateSitePage(fake.db, "no-such-page", { title: "X" })).resolves.toBeNull();
    expect(fake.writes).toHaveLength(0);
  });
});

describe("deleteSitePage", () => {
  it("повертає true, коли рядок видалено", async () => {
    const fake = createFakeDb(() => ({ meta: { changes: 1 } }));

    await expect(deleteSitePage(fake.db, "page-2")).resolves.toBe(true);
    expect(fake.writes[0].bindings).toEqual(["page-2"]);
  });

  it("повертає false, коли видаляти нічого", async () => {
    const fake = createFakeDb(() => ({ meta: { changes: 0 } }));

    await expect(deleteSitePage(fake.db, "no-such-page")).resolves.toBe(false);
  });
});
