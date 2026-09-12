/**
 * useSiteEditor — стан і дії редактора сайту.
 *
 * Тут лише композиція: дані — з `useSiteData`, мережа й діалоги — з
 * `actions.ts`, чисті перетворення — з `form.ts`. Компоненти отримують цей
 * об'єкт і лишаються чистим рендерингом.
 *
 * Діалоги — зі спільного `useDialog`, а не `window.prompt/confirm/alert`:
 * останні не працюють у Telegram Mini App на iOS, тож «Додати сторінку» на
 * телефоні просто нічого не робила.
 *
 * Форма налаштувань не синхронізується ефектом, а обчислюється під час
 * рендера: значення із сайту + правки користувача. Тому після збереження
 * достатньо скинути правки (`setSettingsPatch({})`), а не перезаписувати стан.
 *
 * @module web-platform-dev/src/pages/site-editor
 */

import { useCallback, useMemo, useState } from "react";
import type { NavigationItem, SitePage } from "@wwwuabot/shared/types/site";
import { isValidSlug } from "@wwwuabot/shared/constants/site-defaults";
import { useDialog } from "@wwwuabot/ui/dialog";
import { createPage, deletePage, publishSite, saveSiteSettings } from "./actions";
import { errorMessage, toSettingsForm } from "./form";
import { useSiteData } from "./useSiteData";
import type { SiteEditorApi, SiteEditorTab, SiteSettingsForm } from "./types";

export function useSiteEditor(slug: string | undefined): SiteEditorApi {
  const dialog = useDialog();
  const data = useSiteData(slug);

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SiteEditorTab>("pages");
  const [editingPageSlug, setEditingPageSlug] = useState<string | null>(null);
  const [settingsPatch, setSettingsPatch] = useState<Partial<SiteSettingsForm>>({});
  const [navPatch, setNavPatch] = useState<NavigationItem[] | null>(null);

  const settings = useMemo<SiteSettingsForm>(
    () => ({ ...toSettingsForm(data.site), ...settingsPatch }),
    [data.site, settingsPatch],
  );

  const navItems = useMemo(
    () => navPatch ?? data.site?.settings?.navigation ?? [],
    [navPatch, data.site],
  );

  const updateSettings = useCallback(
    (patch: Partial<SiteSettingsForm>) => setSettingsPatch((prev) => ({ ...prev, ...patch })),
    [],
  );

  /** Скидає правки після успішного запису — далі стан знову йде із сервера. */
  const dropLocalEdits = useCallback(() => {
    setSettingsPatch({});
    setNavPatch(null);
  }, []);

  const withSaving = useCallback(async (action: () => Promise<void>) => {
    setSaving(true);
    try {
      await action();
    } finally {
      setSaving(false);
    }
  }, []);

  const reportError = useCallback(
    (error: string) => dialog.alert(error, { tone: "danger" }),
    [dialog],
  );

  // ── Сторінки ─────────────────────────────────────────────

  const addPage = useCallback(async () => {
    const title = await dialog.prompt("Назва сторінки:", { title: "Нова сторінка" });
    if (!title?.trim()) return;

    await withSaving(async () => {
      const result = await createPage(dialog, slug, title);
      if (result.error) await reportError(result.error);
      if (result.ok) await data.reloadPages();
    });
  }, [data, dialog, reportError, slug, withSaving]);

  const removePage = useCallback(
    async (page: SitePage) => {
      const result = await deletePage(dialog, slug, page);
      if (result.error) await reportError(result.error);
      if (!result.ok) return;
      await data.reloadPages();
      setEditingPageSlug((current) => (current === page.slug ? null : current));
    },
    [data, dialog, reportError, slug],
  );

  // ── Налаштування й меню ──────────────────────────────────

  const saveSettings = useCallback(async () => {
    await withSaving(async () => {
      try {
        await saveSiteSettings(slug, settings, navItems);
        dropLocalEdits();
        await data.loadSite();
      } catch (e) {
        await reportError(errorMessage(e, "Помилка збереження"));
      }
    });
  }, [data, dropLocalEdits, navItems, reportError, settings, slug, withSaving]);

  const addNavItem = useCallback(async () => {
    const label = await dialog.prompt("Назва пункту меню:", { title: "Новий пункт меню" });
    if (!label?.trim()) return;

    const rawSlug = await dialog.prompt("Адрес сторінки (slug):", {
      title: "Куди веде пункт",
      placeholder: "about",
    });
    if (!rawSlug?.trim()) return;

    const target = rawSlug.trim();
    if (!isValidSlug(target)) {
      await reportError(`«${target}» не схоже на адрес: дозволені лише літери, цифри й дефіс.`);
      return;
    }
    if (!data.pages.some((page) => page.slug === target)) {
      await reportError(`Сторінки «/${target}» не існує. Спершу створіть її.`);
      return;
    }

    setNavPatch((prev) => {
      const current = prev ?? data.site?.settings?.navigation ?? [];
      return [...current, { label: label.trim(), pageSlug: target, order: current.length }];
    });
  }, [data.pages, data.site, dialog, reportError]);

  const removeNavItem = useCallback(
    (pageSlug: string) => {
      setNavPatch(
        navItems
          .filter((item) => item.pageSlug !== pageSlug)
          .map((item, index) => ({ ...item, order: index })),
      );
    },
    [navItems],
  );

  const publish = useCallback(async () => {
    await withSaving(async () => {
      const result = await publishSite(dialog, slug);
      if (result.error) await reportError(result.error);
      if (!result.ok) return;
      await data.loadSite();
      await dialog.alert("Сайт подано на модерацію.", { title: "Готово" });
    });
  }, [data, dialog, reportError, slug, withSaving]);

  return {
    site: data.site,
    pages: data.pages,
    loading: data.loading,
    error: data.error,
    saving,
    activeTab,
    setActiveTab,
    editingPageSlug,
    selectPage: setEditingPageSlug,
    settings,
    updateSettings,
    navItems,
    addPage,
    deletePage: removePage,
    saveSettings,
    addNavItem,
    removeNavItem,
    publish,
    reloadPages: data.reloadPages,
  };
}
