/**
 * Вкладка «Налаштування»: назва, опис, тема, логотип, колір, публічність.
 *
 * @module web-platform-dev/src/pages/site-editor
 */

import { Icon } from "@wwwuabot/shared";
import type { SiteEditorApi } from "./types";

const THEMES = [
  { id: "auto", label: "Авто" },
  { id: "light", label: "Світла" },
  { id: "dark", label: "Темна" },
] as const;

export function SettingsTab({ api }: { api: SiteEditorApi }) {
  const { settings, updateSettings, saveSettings, saving } = api;

  return (
    <div className="site-editor-tab site-editor-form">
      <label className="site-editor-field">
        <span className="wb-label">Назва сайту</span>
        <input
          className="wb-input"
          value={settings.title}
          onChange={(e) => updateSettings({ title: e.target.value })}
        />
      </label>

      <label className="site-editor-field">
        <span className="wb-label">Опис</span>
        <textarea
          className="wb-textarea"
          rows={2}
          value={settings.description}
          onChange={(e) => updateSettings({ description: e.target.value })}
        />
      </label>

      <div className="site-editor-field">
        <span className="wb-label">Тема</span>
        <div className="site-editor-theme">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className={`wb-btn wb-btn-sm ${
                settings.theme === theme.id ? "wb-btn-primary" : "wb-btn-ghost"
              }`}
              aria-pressed={settings.theme === theme.id}
              onClick={() => updateSettings({ theme: theme.id })}
            >
              {theme.label}
            </button>
          ))}
        </div>
      </div>

      <label className="site-editor-field">
        <span className="wb-label">URL логотипу</span>
        <input
          className="wb-input"
          type="url"
          inputMode="url"
          placeholder="https://..."
          value={settings.logo}
          onChange={(e) => updateSettings({ logo: e.target.value })}
        />
      </label>

      <label className="site-editor-field">
        <span className="wb-label">Основний колір (hex)</span>
        <input
          className="wb-input"
          placeholder="#4A90D9"
          value={settings.primaryColor}
          onChange={(e) => updateSettings({ primaryColor: e.target.value })}
        />
      </label>

      {/* Чекбокс на всю ширину рядка: на телефоні тапати треба по підпису,
          а не в квадратик 16×16 */}
      <label className="site-editor-check">
        <input
          type="checkbox"
          checked={settings.isPublic}
          onChange={(e) => updateSettings({ isPublic: e.target.checked })}
        />
        <span className="wb-text-sm">Додати в публічний каталог</span>
      </label>

      <button
        type="button"
        className="wb-btn wb-btn-primary"
        onClick={() => void saveSettings()}
        disabled={saving}
      >
        <Icon name="check" size={14} />
        {saving ? "Збереження..." : "Зберегти"}
      </button>
    </div>
  );
}
