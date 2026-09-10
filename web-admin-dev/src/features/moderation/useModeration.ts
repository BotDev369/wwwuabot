/**
 * useModeration — хук для модерації сайтів.
 *
 * Надає функції для перегляду, схвалення та відхилення сайтів.
 *
 * @module web-admin-dev/src/features/moderation/useModeration
 */

import { useState, useCallback } from "react";
import type { Site, SitePage } from "@wwwuabot/shared";

// ── Types ────────────────────────────────────────────────────

export interface ModerationState {
  pending: Site[];
  selected: Site | null;
  selectedPages: SitePage[];
  loading: boolean;
  error: string | null;
}

// ── Hook ─────────────────────────────────────────────────────

export function useModeration() {
  const [state, setState] = useState<ModerationState>({
    pending: [],
    selected: null,
    selectedPages: [],
    loading: false,
    error: null,
  });

  /** Завантажити чергу модерації. */
  const loadPending = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch("/api/admin/sites/pending");
      if (!res.ok) throw new Error("Failed to load pending sites");
      const data = await res.json();
      setState((s) => ({
        ...s,
        pending: data.sites ?? [],
        loading: false,
      }));
    } catch (e) {
      setState((s) => ({
        ...s,
        error: e instanceof Error ? e.message : "Помилка завантаження",
        loading: false,
      }));
    }
  }, []);

  /** Обрати сайт для перегляду. */
  const selectSite = useCallback(async (site: Site) => {
    setState((s) => ({ ...s, selected: site, selectedPages: [] }));
    try {
      const res = await fetch(`/api/sites/${site.slug}`);
      if (res.ok) {
        const data = await res.json();
        setState((s) => ({
          ...s,
          selectedPages: data.pages ?? [],
        }));
      }
    } catch {
      // ignore — показуємо без сторінок
    }
  }, []);

  /** Зняти виділення. */
  const clearSelection = useCallback(() => {
    setState((s) => ({ ...s, selected: null, selectedPages: [] }));
  }, []);

  /** Схвалити публікацію. */
  const approve = useCallback(async (slug: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/sites/${slug}/approve`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to approve");
      setState((s) => ({
        ...s,
        pending: s.pending.filter((site) => site.slug !== slug),
        selected: s.selected?.slug === slug ? null : s.selected,
        selectedPages: s.selected?.slug === slug ? [] : s.selectedPages,
      }));
      return true;
    } catch (e) {
      setState((s) => ({
        ...s,
        error: e instanceof Error ? e.message : "Помилка схвалення",
      }));
      return false;
    }
  }, []);

  /** Відхилити публікацію. */
  const reject = useCallback(async (slug: string, reason?: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/sites/${slug}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || undefined }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      setState((s) => ({
        ...s,
        pending: s.pending.filter((site) => site.slug !== slug),
        selected: s.selected?.slug === slug ? null : s.selected,
        selectedPages: s.selected?.slug === slug ? [] : s.selectedPages,
      }));
      return true;
    } catch (e) {
      setState((s) => ({
        ...s,
        error: e instanceof Error ? e.message : "Помилка відхилення",
      }));
      return false;
    }
  }, []);

  /** Очистити помилку. */
  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return {
    ...state,
    loadPending,
    selectSite,
    clearSelection,
    approve,
    reject,
    clearError,
  };
}
