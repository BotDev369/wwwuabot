/**
 * Site New — сторінка створення нового сайту з шаблону.
 *
 * @module web-platform-dev/src/pages/SiteNewPage
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Template, SiteTemplateConfig, PageTemplateConfig } from "@wwwuabot/shared/types/site";
import { isValidSlug, generateSlug } from "@wwwuabot/shared/constants/site-defaults";
import { Icon } from "@wwwuabot/shared";
import { TemplatePicker } from "@/features/site-builder/TemplatePicker";

// ── Component ────────────────────────────────────────────────

export function SiteNewPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"template" | "details">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Авто-генерація slug з назви
  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) {
      setSlug(generateSlug(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setSlug(generateSlug(value));
  };

  const slugValid = slug ? isValidSlug(slug) : false;

  // Крок 2: показати поля для введення
  const handleTemplateNext = () => {
    setStep("details");
  };

  // Створення сайту
  const handleCreate = async () => {
    if (!title.trim() || !slugValid) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug.trim(),
          title: title.trim(),
          templateId: selectedTemplate?.id ?? undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create site");
      }

      const data = await res.json();

      // Якщо обрано шаблон — застосовуємо його конфігурацію
      if (selectedTemplate && data.site) {
        await applyTemplate(data.site.slug, selectedTemplate);
      }

      // Переходимо до редактора
      navigate(`/sites/${slug.trim()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка створення сайту");
    } finally {
      setSaving(false);
    }
  };

  // Застосування шаблону до нового сайту
  const applyTemplate = async (siteSlug: string, template: Template) => {
    const config = template.config;

    if (template.type === "site") {
      const siteConfig = config as SiteTemplateConfig;

      // Оновлюємо налаштування (навігація, тема)
      await fetch(`/api/sites/${siteSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: siteConfig.settings,
        }),
      });

      // Створюємо сторінки з шаблону
      for (const pageConfig of siteConfig.pages) {
        await fetch(`/api/sites/${siteSlug}/pages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: pageConfig.slug,
            title: pageConfig.title,
            pageData: pageConfig.pageData,
          }),
        });
      }
    } else {
      // Page-шаблон: оновлюємо домашню сторінку
      const pageConfig = config as PageTemplateConfig;

      // Отримуємо сторінки сайту, щоб знайти home
      const pagesRes = await fetch(`/api/sites/${siteSlug}/pages`);
      const pagesData = await pagesRes.json();
      const homePage = pagesData.pages?.[0];

      if (homePage) {
        await fetch(`/api/sites/${siteSlug}/pages/${homePage.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageData: pageConfig.pageData,
          }),
        });
      }
    }
  };

  // ── Крок 1: Вибір шаблону ────────────────────────────────

  if (step === "template") {
    return (
      <div style={{ padding: "var(--sp-5)", maxWidth: 900, margin: "0 auto" }}>
        {/* Назад */}
        <button
          className="wb-btn wb-btn-ghost wb-btn-sm"
          onClick={() => navigate("/sites")}
          style={{ marginBottom: "var(--sp-4)" }}
        >
          <Icon name="arrow-left" size={14} />
          Назад до списку
        </button>

        <h1 style={{ margin: 0, marginBottom: "var(--sp-5)", fontSize: "var(--text-xl)" }}>
          Створити новий сайт
        </h1>

        <TemplatePicker
          selected={selectedTemplate}
          onSelect={setSelectedTemplate}
        />

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--sp-4)" }}>
          <button
            className="wb-btn wb-btn-primary"
            onClick={handleTemplateNext}
          >
            Далі
            <Icon name="chevron-right" size={14} />
          </button>
        </div>
      </div>
    );
  }

  // ── Крок 2: Дані сайту ──────────────────────────────────

  return (
    <div style={{ padding: "var(--sp-5)", maxWidth: 600, margin: "0 auto" }}>
      {/* Назад */}
      <button
        className="wb-btn wb-btn-ghost wb-btn-sm"
        onClick={() => setStep("template")}
        style={{ marginBottom: "var(--sp-4)" }}
      >
        <Icon name="arrow-left" size={14} />
        Назад до шаблонів
      </button>

      <h1 style={{ margin: 0, marginBottom: "var(--sp-5)", fontSize: "var(--text-xl)" }}>
        Дані сайту
      </h1>

      {/* Обраний шаблон */}
      {selectedTemplate && (
        <div className="wb-card" style={{ marginBottom: "var(--sp-4)" }}>
          <div className="wb-card-body" style={{ padding: "var(--sp-3)" }}>
            <div className="wb-flex-between">
              <span className="wb-text-sm" style={{ fontWeight: 600 }}>
                {selectedTemplate.name}
              </span>
              <button
                className="wb-btn wb-btn-ghost wb-btn-sm"
                onClick={() => setStep("template")}
              >
                Змінити
              </button>
            </div>
            {selectedTemplate.description && (
              <p className="wb-text-xs wb-text-muted" style={{ marginTop: "var(--sp-1)" }}>
                {selectedTemplate.description}
              </p>
            )}
          </div>
        </div>
      )}

      {!selectedTemplate && (
        <div className="wb-card" style={{ marginBottom: "var(--sp-4)" }}>
          <div className="wb-card-body" style={{ padding: "var(--sp-3)" }}>
            <div className="wb-flex-between">
              <span className="wb-text-sm" style={{ fontWeight: 600 }}>
                З нуля (без шаблону)
              </span>
              <button
                className="wb-btn wb-btn-ghost wb-btn-sm"
                onClick={() => setStep("template")}
              >
                Змінити
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Помилка */}
      {error && (
        <div style={{
          padding: "var(--sp-3)",
          background: "var(--red-dim)",
          borderRadius: "var(--radius-md)",
          marginBottom: "var(--sp-4)",
          display: "flex",
          alignItems: "center",
          gap: "var(--sp-2)",
        }}>
          <Icon name="x" size={16} />
          <span className="wb-text-sm">{error}</span>
        </div>
      )}

      {/* Форма */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
        {/* Назва */}
        <div>
          <label className="wb-label">Назва сайту</label>
          <input
            className="wb-input"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Напр. Моя компанія"
            autoFocus
          />
          <p className="wb-text-xs wb-text-muted" style={{ marginTop: "var(--sp-1)" }}>
            Відображатиметься в заголовку сайту та в каталозі
          </p>
        </div>

        {/* Slug */}
        <div>
          <label className="wb-label">Адреса сайту (slug)</label>
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            <span className="wb-text-sm wb-text-muted" style={{ padding: "0 var(--sp-2)" }}>
              t.me/WWWUABot/
            </span>
            <input
              className={`wb-input ${!slugValid && slug ? "wb-input-error" : ""}`}
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="moia-kompaniia"
              style={{ flex: 1 }}
            />
          </div>
          {slug && !slugValid && (
            <p className="wb-text-xs wb-text-red" style={{ marginTop: "var(--sp-1)" }}>
              Slug може містити лише літери, цифри та дефіси
            </p>
          )}
          {slugValid && (
            <p className="wb-text-xs wb-text-green" style={{ marginTop: "var(--sp-1)" }}>
              /{slug} — виглядає добре
            </p>
          )}
        </div>

        {/* Кнопки */}
        <div style={{ display: "flex", gap: "var(--sp-3)", marginTop: "var(--sp-2)" }}>
          <button
            className="wb-btn wb-btn-primary"
            onClick={handleCreate}
            disabled={saving || !title.trim() || !slugValid}
          >
            {saving ? (
              <>
                <div className="wb-spinner" style={{ width: 14, height: 14 }} />
                Створення...
              </>
            ) : (
              <>
                <Icon name="check" size={14} />
                Створити сайт
              </>
            )}
          </button>
          <button
            className="wb-btn wb-btn-ghost"
            onClick={() => navigate("/sites")}
            disabled={saving}
          >
            Скасувати
          </button>
        </div>
      </div>
    </div>
  );
}
