/**
 * useSiteApi — хук для API-запитів до Sites.
 *
 * Містить CRUD операції для сайтів, сторінок та шаблонів.
 *
 * @module web-platform-dev/src/features/site-builder/useSiteApi
 */

import { useState, useCallback } from "react";
import type { Site, SitePage, CatalogSite, Template } from "@wwwuabot/shared";
import { apiFetchRaw } from "@/shared/api/client";

// ── Types ────────────────────────────────────────────────────

interface CreateSiteInput {
  slug: string;
  title: string;
  description?: string;
  templateId?: string;
}

interface UpdateSiteInput {
  title?: string;
  description?: string;
  isPublic?: boolean;
  settings?: Record<string, unknown>;
}

interface CreatePageInput {
  slug: string;
  title: string;
  pageData?: Record<string, unknown>;
}

interface UpdatePageInput {
  title?: string;
  pageData?: Record<string, unknown>;
  slug?: string;
  orderIndex?: number;
  status?: "draft" | "published";
}

// ── Hook ─────────────────────────────────────────────────────

export function useSiteApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // ── Sites ───────────────────────────────────────────────

  const fetchMySites = useCallback(async (): Promise<Site[]> => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetchRaw("/api/sites");
      if (!res.ok) throw new Error("Failed to load sites");
      const data = await res.json();
      return data.sites ?? [];
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Помилка завантаження";
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSite = useCallback(async (slug: string): Promise<Site | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetchRaw(`/api/sites/${slug}`);
      if (!res.ok) throw new Error("Site not found");
      const data = await res.json();
      return data.site ?? null;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка завантаження");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createSite = useCallback(async (input: CreateSiteInput): Promise<Site | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetchRaw("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create site");
      }
      const data = await res.json();
      return data.site ?? null;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка створення");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSite = useCallback(async (slug: string, input: UpdateSiteInput): Promise<Site | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetchRaw(`/api/sites/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed to update site");
      const data = await res.json();
      return data.site ?? null;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка оновлення");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSite = useCallback(async (slug: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetchRaw(`/api/sites/${slug}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete site");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка видалення");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const publishSite = useCallback(async (slug: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetchRaw(`/api/sites/${slug}/publish`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to publish");
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка публікації");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Pages ───────────────────────────────────────────────

  const fetchPages = useCallback(async (siteSlug: string): Promise<SitePage[]> => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetchRaw(`/api/sites/${siteSlug}/pages`);
      if (!res.ok) throw new Error("Failed to load pages");
      const data = await res.json();
      return data.pages ?? [];
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка завантаження сторінок");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createPage = useCallback(async (siteSlug: string, input: CreatePageInput): Promise<SitePage | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetchRaw(`/api/sites/${siteSlug}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create page");
      }
      const data = await res.json();
      return data.page ?? null;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка створення сторінки");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePage = useCallback(async (siteSlug: string, pageId: string, input: UpdatePageInput): Promise<SitePage | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetchRaw(`/api/sites/${siteSlug}/pages/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed to update page");
      const data = await res.json();
      return data.page ?? null;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка оновлення сторінки");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePage = useCallback(async (siteSlug: string, pageId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetchRaw(`/api/sites/${siteSlug}/pages/${pageId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete page");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка видалення сторінки");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Templates ───────────────────────────────────────────

  const fetchTemplates = useCallback(async (): Promise<Template[]> => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetchRaw("/api/templates");
      if (!res.ok) throw new Error("Failed to load templates");
      const data = await res.json();
      return data.templates ?? [];
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка завантаження шаблонів");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Catalog ─────────────────────────────────────────────

  const fetchCatalog = useCallback(async (page = 1, limit = 20): Promise<{ sites: CatalogSite[]; total: number }> => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetchRaw(`/api/catalog?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to load catalog");
      const data = await res.json();
      return { sites: data.sites ?? [], total: data.total ?? 0 };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка завантаження каталогу");
      return { sites: [], total: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    clearError,
    // Sites
    fetchMySites,
    fetchSite,
    createSite,
    updateSite,
    deleteSite,
    publishSite,
    // Pages
    fetchPages,
    createPage,
    updatePage,
    deletePage,
    // Templates
    fetchTemplates,
    // Catalog
    fetchCatalog,
  };
}
