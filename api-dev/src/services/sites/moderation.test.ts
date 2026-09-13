import { describe, it, expect } from "vitest";
import {
  approveSite,
  getAllSites,
  getPendingSites,
  rejectSite,
  submitSiteForModeration,
  unpublishSite,
} from "./moderation";
import { createFakeDb, pageRow, siteRow } from "./fake-db";
import type { SitePageRow, SiteRow } from "@wwwuabot/shared/types/site";

/**
 * Тести статусного автомата `draft → pending → published | rejected`.
 *
 * Головна ідея, яку вони тримають: **перехід або відбувається, або нічого не
 * змінює**. Тому кожен тест «неможливого» переходу перевіряє не лише `null` у
 * відповіді, а й те, що в базу не пішло **жодного** запису — статус не можна
 * змінити «наполовину».
 *
 * @module api-dev/src/services/sites/moderation.test
 */

const PUBLISHED_AT = "2026-09-13 12:00:00";

/**
 * Сховище, яке двійник оновлює так само, як це зробив би D1.
 * Так тест бачить кінцевий стан, а не лише текст SQL.
 */
function store(initial: Partial<SiteRow> = {}, pages: SitePageRow[] = [pageRow({ id: "p1" })]) {
  const state = { site: siteRow(initial), pages: [...pages] };

  const fake = createFakeDb((sql, bindings) => {
    if (sql.startsWith("SELECT * FROM sites WHERE slug = ?")) return state.site;
    if (sql.startsWith("SELECT * FROM site_pages WHERE site_id")) return state.pages;
    if (sql.startsWith("SELECT * FROM site_pages WHERE id = ?")) {
      return state.pages.find((p) => p.id === bindings[0]) ?? null;
    }
    if (sql.startsWith("UPDATE sites SET status = 'pending'")) {
      state.site = { ...state.site, status: "pending", reject_reason: null };
      return {};
    }
    if (sql.startsWith("UPDATE sites SET status = 'draft'")) {
      state.site = { ...state.site, status: "draft" };
      return {};
    }
    if (sql.startsWith("UPDATE sites SET status = 'published'")) {
      state.site = { ...state.site, status: "published", published_at: PUBLISHED_AT };
      return {};
    }
    if (sql.startsWith("UPDATE sites SET status = 'rejected'")) {
      state.site = { ...state.site, status: "rejected", reject_reason: String(bindings[0] ?? "") };
      return {};
    }
    if (sql.startsWith("UPDATE site_pages SET status = ?")) {
      // `pageId` — останній параметр (`... , ?) WHERE id = ?`).
      const pageId = bindings[bindings.length - 1];
      state.pages = state.pages.map((p) =>
        p.id === pageId ? { ...p, status: "published", published_at: PUBLISHED_AT } : p,
      );
      return {};
    }
    return null;
  });

  return { fake, state };
}

describe("submitSiteForModeration", () => {
  it("подає draft у чергу й чистить стару причину відхилення", async () => {
    const { fake } = store({ status: "draft", reject_reason: "стара причина" });

    const site = await submitSiteForModeration(fake.db, "my-site");

    expect(site?.status).toBe("pending");
    expect(site?.rejectReason).toBeUndefined();
    expect(fake.countWrites("UPDATE sites SET status = 'pending'")).toBe(1);
  });

  it("дозволяє подати знову після відхилення", async () => {
    const { fake } = store({ status: "rejected", reject_reason: "фото неякісне" });

    await expect(submitSiteForModeration(fake.db, "my-site")).resolves.toMatchObject({
      status: "pending",
    });
  });

  it("⛔ не ставить у чергу вдруге (pending)", async () => {
    const { fake } = store({ status: "pending" });

    await expect(submitSiteForModeration(fake.db, "my-site")).resolves.toBeNull();
    expect(fake.writes).toHaveLength(0);
  });

  it("⛔ не знімає з публікації опублікований сайт", async () => {
    const { fake } = store({ status: "published" });

    await expect(submitSiteForModeration(fake.db, "my-site")).resolves.toBeNull();
    expect(fake.writes).toHaveLength(0);
  });

  it("⛔ нічого не робить для невідомого slug", async () => {
    const fake = createFakeDb(() => null);

    await expect(submitSiteForModeration(fake.db, "no-such-site")).resolves.toBeNull();
    expect(fake.writes).toHaveLength(0);
  });
});

describe("approveSite", () => {
  it("публікує сайт і всі його сторінки", async () => {
    const { fake, state } = store({ status: "pending" }, [
      pageRow({ id: "p1", order_index: 0 }),
      pageRow({ id: "p2", slug: "about", order_index: 1 }),
    ]);

    const site = await approveSite(fake.db, "my-site");

    expect(site?.status).toBe("published");
    expect(site?.publishedAt).toBe(PUBLISHED_AT);
    // Опублікований сайт із чернетковими сторінками виглядав би порожнім.
    expect(state.pages.map((p) => p.status)).toEqual(["published", "published"]);
    expect(fake.countWrites("UPDATE site_pages SET status = ?")).toBe(2);
  });

  it("⛔ не публікує сайт повз чергу (draft)", async () => {
    const { fake } = store({ status: "draft" });

    await expect(approveSite(fake.db, "my-site")).resolves.toBeNull();
    expect(fake.writes).toHaveLength(0);
  });

  it("⛔ не публікує вдруге (published)", async () => {
    const { fake } = store({ status: "published" });

    await expect(approveSite(fake.db, "my-site")).resolves.toBeNull();
    expect(fake.writes).toHaveLength(0);
  });
});

describe("rejectSite", () => {
  it("записує причину відхилення", async () => {
    const { fake } = store({ status: "pending" });

    const site = await rejectSite(fake.db, "my-site", "Заборонений контент");

    expect(site?.status).toBe("rejected");
    expect(site?.rejectReason).toBe("Заборонений контент");
  });

  it("приймає відхилення без причини", async () => {
    const { fake } = store({ status: "pending" });

    const site = await rejectSite(fake.db, "my-site");

    expect(site?.status).toBe("rejected");
  });

  it("⛔ не відхиляє те, що не на модерації", async () => {
    const { fake } = store({ status: "draft" });

    await expect(rejectSite(fake.db, "my-site", "не важливо")).resolves.toBeNull();
    expect(fake.writes).toHaveLength(0);
  });
});

describe("unpublishSite", () => {
  it("повертає сайт із черги в draft", async () => {
    const { fake } = store({ status: "pending" });

    await expect(unpublishSite(fake.db, "my-site")).resolves.toMatchObject({ status: "draft" });
  });

  it("⛔ не «знімає» те, що вже в draft, і не чіпає опубліковане", async () => {
    for (const status of ["draft", "published", "rejected"] as const) {
      const { fake } = store({ status });
      await expect(unpublishSite(fake.db, "my-site")).resolves.toBeNull();
      expect(fake.writes, `статус ${status}`).toHaveLength(0);
    }
  });
});

describe("адмінські списки", () => {
  it("getPendingSites вибирає лише сайти на модерації", async () => {
    const fake = createFakeDb((sql) =>
      sql.startsWith("SELECT * FROM sites WHERE status = 'pending'")
        ? [siteRow({ status: "pending" })]
        : null,
    );

    const sites = await getPendingSites(fake.db);

    expect(sites.map((s) => s.slug)).toEqual(["my-site"]);
    expect(fake.reads[0].sql).toContain("status = 'pending'");
  });

  it("getAllSites збирає WHERE з фільтрів у сталому порядку", async () => {
    const fake = createFakeDb(() => ({ results: [] }));

    await getAllSites(fake.db, { status: "published", ownerId: 7 });

    expect(fake.reads[0].sql).toContain("WHERE status = ? AND owner_id = ?");
    expect(fake.reads[0].bindings).toEqual(["published", 7]);
    expect(fake.reads[0].sql).toContain("ORDER BY updated_at DESC");
  });

  it("getAllSites без фільтрів не додає WHERE", async () => {
    const fake = createFakeDb(() => ({ results: [] }));

    await getAllSites(fake.db);

    expect(fake.reads[0].sql).toBe("SELECT * FROM sites ORDER BY updated_at DESC");
  });
});
