/**
 * Панель редактора: заголовок сайту, вкладки, їхній вміст і публікація.
 *
 * @module web-platform-dev/src/pages/site-editor
 */

import type { Site } from "@wwwuabot/shared/types/site";
import {
  SITE_STATUS_BADGE_CLASS,
  SITE_STATUS_LABELS,
} from "@wwwuabot/shared/constants/site-defaults";
import { SiteRenderer } from "@wwwuabot/ui/SiteRenderer";
import { PagesTab } from "./PagesTab";
import { NavigationTab } from "./NavigationTab";
import { SettingsTab } from "./SettingsTab";
import type { SiteEditorApi, SiteEditorTab } from "./types";

const TABS: { id: SiteEditorTab; label: string }[] = [
  { id: "pages", label: "Сторінки" },
  { id: "navigation", label: "Меню" },
  { id: "settings", label: "Налашт." },
  { id: "preview", label: "Перегляд" },
];

export function SiteEditorPanel({ api, site }: { api: SiteEditorApi; site: Site }) {
  const { activeTab, setActiveTab, pages, publish, saving } = api;
  const isPending = site.status === "pending";

  return (
    <div className="site-editor-panel">
      <div className="site-editor-panel-head">
        <div className="wb-flex-between site-editor-tab-head">
          <h2 className="site-editor-title">{site.title}</h2>
          <span className={SITE_STATUS_BADGE_CLASS[site.status] ?? "wb-badge wb-badge-neutral"}>
            {SITE_STATUS_LABELS[site.status] ?? site.status}
          </span>
        </div>
        <p className="wb-text-xs wb-text-muted">/{site.slug}</p>
      </div>

      <div className="site-editor-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`site-editor-tab-btn${activeTab === tab.id ? " site-editor-tab-btn--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="site-editor-tab-content">
        {activeTab === "pages" && <PagesTab api={api} />}
        {activeTab === "navigation" && <NavigationTab api={api} />}
        {activeTab === "settings" && <SettingsTab api={api} />}
        {activeTab === "preview" &&
          (pages.length > 0 ? (
            <SiteRenderer site={site} pages={pages} mode="preview" className="site-preview" />
          ) : (
            <p className="wb-text-muted">Спочатку додайте сторінки</p>
          ))}
      </div>

      <div className="site-editor-panel-foot">
        <button
          type="button"
          className="wb-btn wb-btn-primary"
          onClick={() => void publish()}
          disabled={saving || isPending}
        >
          {isPending ? "На модерації" : "Опублікувати"}
        </button>
      </div>
    </div>
  );
}
