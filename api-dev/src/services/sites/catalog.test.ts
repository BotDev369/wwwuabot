import { describe, it, expect } from "vitest";
import { getCatalogSiteBySlug, getCatalogSites } from "./catalog";
import { createFakeDb, pageRow, siteRow } from "./fake-db";

/**
 * Тести публічного каталогу — єдиного модуля домену **без авторизації**.
 *
 * Саме тому тут найважливіше — не пагінація, а умова видимості:
 * `status = 'published'` **і** `is_public = 1`. Без другої умови сайт, який
 * користувач опублікував лише для себе, з'явився б у спільному каталозі, і
 * помітити це можна було б тільки скаргою користувача. Обидва запити (список і
 * пошук за slug) мусять містити обидві умови — тому це перевіряється окремо.
 *
 * @module api-dev/src/services/sites/catalog.test
 */

describe("getCatalogSites", () => {
  it("вибирає лише опубліковані **і** публічні сайти — і в списку, і в лічильнику", async () => {
    const fake = createFakeDb(() => ({ results: [] }));

    await getCatalogSites(fake.db);

    expect(fake.reads).toHaveLength(2);
    for (const query of fake.reads) {
      expect(query.sql, `запит мусить фільтрувати: ${query.sql}`).toContain(
        "status = 'published' AND is_public = 1",
      );
    }
  });

  it("обмежує limit розміром сторінки каталогу", async () => {
    const fake = createFakeDb(() => ({ results: [] }));

    await getCatalogSites(fake.db, { limit: 500 });
    expect(fake.reads[1].bindings).toEqual([50, 0]);

    const other = createFakeDb(() => ({ results: [] }));
    await getCatalogSites(other.db);
    expect(other.reads[1].bindings).toEqual([20, 0]);
  });

  it("рахує offset зі сторінки й ліміту", async () => {
    const fake = createFakeDb(() => ({ results: [] }));

    await getCatalogSites(fake.db, { page: 3, limit: 10 });

    expect(fake.reads[1].bindings).toEqual([10, 20]);
  });

  it("віддає загальну кількість і короткий опис сайту", async () => {
    const fake = createFakeDb((sql) => {
      if (sql.startsWith("SELECT COUNT(*)")) return { c: 7 };
      return {
        results: [
          siteRow({ published_at: "2026-09-10 08:00:00", description: "Опис", thumbnail: "t.png" }),
        ],
      };
    });

    const { sites, total } = await getCatalogSites(fake.db);

    expect(total).toBe(7);
    expect(sites).toEqual([
      {
        slug: "my-site",
        title: "Мій сайт",
        description: "Опис",
        thumbnail: "t.png",
        publishedAt: "2026-09-10 08:00:00",
      },
    ]);
  });

  it("бере дату оновлення, якщо дата публікації порожня", async () => {
    const fake = createFakeDb(() => ({
      results: [siteRow({ published_at: null, updated_at: "2026-09-11 09:30:00" })],
    }));

    const { sites } = await getCatalogSites(fake.db);

    expect(sites[0].publishedAt).toBe("2026-09-11 09:30:00");
  });
});

describe("getCatalogSiteBySlug", () => {
  it("шукає сайт з обома умовами видимості", async () => {
    const fake = createFakeDb((sql) => {
      if (sql.startsWith("SELECT * FROM site_pages WHERE site_id")) return [pageRow()];
      return siteRow({ status: "published", is_public: 1 });
    });

    const result = await getCatalogSiteBySlug(fake.db, "my-site");

    expect(fake.reads[0].sql).toContain("slug = ? AND status = 'published' AND is_public = 1");
    expect(result?.site.slug).toBe("my-site");
    expect(result?.pages).toHaveLength(1);
  });

  it("не віддає сторінки того, хто не проходить умову видимості", async () => {
    const fake = createFakeDb((sql) =>
      sql.startsWith("SELECT * FROM site_pages") ? [pageRow()] : null,
    );

    await expect(getCatalogSiteBySlug(fake.db, "private-site")).resolves.toBeNull();
    expect(fake.reads).toHaveLength(1); // сторінки навіть не запитувались
  });
});
