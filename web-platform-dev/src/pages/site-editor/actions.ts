/**
 * Дії редактора сайту: мережа й діалоги, без React-стану.
 *
 * Так їх можна прочитати окремо від хука, а хук лишається про стан. Кожна дія
 * сама питає користувача, якщо потрібно, і повертає результат замість того,
 * щоб кидати виняток посеред обробника кліку.
 *
 * @module web-platform-dev/src/pages/site-editor
 */

import type { NavigationItem, SitePage } from "@wwwuabot/shared/types/site";
import { isValidSlug } from "@wwwuabot/shared/constants/site-defaults";
import type { DialogApi } from "@wwwuabot/ui/dialog";
import { apiFetchRaw } from "@/shared/api/client";
import { errorMessage, slugify } from "./form";
import type { SiteSettingsForm } from "./types";

/**
 * `ok` — стан на сервері змінився, дані треба перечитати.
 * `error` — людині треба це показати.
 */
export interface ActionResult {
  ok: boolean;
  error?: string;
  /** Текст, який уже показали в діалозі (щоб не дублювати повідомлення). */
  shown?: boolean;
}

export async function createPage(
  dialog: DialogApi,
  siteSlug: string | undefined,
  rawTitle: string,
): Promise<ActionResult> {
  if (!siteSlug) return { ok: false };

  const pageSlug = slugify(rawTitle);
  if (!isValidSlug(pageSlug)) {
    await dialog.alert(`З назви «${rawTitle}» не виходить коректний адрес. Спробуйте іншу.`, {
      tone: "danger",
    });
    return { ok: false, shown: true };
  }

  try {
    const res = await apiFetchRaw(`/api/sites/${siteSlug}/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: pageSlug, title: rawTitle.trim() }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Не вдалося створити сторінку");
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e, "Помилка створення") };
  }
}

export async function deletePage(
  dialog: DialogApi,
  siteSlug: string | undefined,
  page: SitePage,
): Promise<ActionResult> {
  if (!siteSlug) return { ok: false };

  if (page.slug === "home") {
    await dialog.alert("Головну сторінку видалити не можна.", { tone: "danger" });
    return { ok: false, shown: true };
  }

  const confirmed = await dialog.confirm(`Видалити сторінку «${page.title}»?`, {
    tone: "danger",
    confirmText: "Видалити",
  });
  if (!confirmed) return { ok: false };

  try {
    const res = await apiFetchRaw(`/api/sites/${siteSlug}/pages/${page.id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Не вдалося видалити сторінку");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e, "Помилка видалення") };
  }
}

export async function publishSite(
  dialog: DialogApi,
  siteSlug: string | undefined,
): Promise<ActionResult> {
  if (!siteSlug) return { ok: false };

  const confirmed = await dialog.confirm("Подати сайт на модерацію?", { confirmText: "Подати" });
  if (!confirmed) return { ok: false };

  try {
    const res = await apiFetchRaw(`/api/sites/${siteSlug}/publish`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Не вдалося подати на модерацію");
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e, "Помилка публікації") };
  }
}

/** Зберігає назву, опис, тему, логотип, колір і меню одним запитом. */
export async function saveSiteSettings(
  siteSlug: string | undefined,
  settings: SiteSettingsForm,
  navigation: NavigationItem[],
): Promise<void> {
  if (!siteSlug) return;

  const res = await apiFetchRaw(`/api/sites/${siteSlug}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: settings.title,
      description: settings.description || undefined,
      isPublic: settings.isPublic,
      settings: {
        theme: settings.theme,
        logo: settings.logo,
        primaryColor: settings.primaryColor,
        navigation,
      },
    }),
  });
  if (!res.ok) throw new Error("Не вдалося зберегти");
}
