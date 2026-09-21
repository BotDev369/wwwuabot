/**
 * `/profile/theme` — хаб теми: список її розділів.
 *
 * **Список, а не форма.** Тема — це місце, куди приходять обирати: спершу
 * характер (стиль), потім готове, далі своє. Тому рядки тут **більші** за
 * звичайні пункти меню й приглушені в поясненні: людина читає їх очима, а
 * обирає дотиком.
 *
 * **Рядок — адреса, а не поверхня.** Кожен розділ має свою сторінку зі своєю
 * адресою: її видно в рядку браузера, пам'ятає історія, можна надіслати, а
 * «назад» вертає **сюди**, а не виходить із застосунку. Саме через це тема
 * перестала бути модалкою.
 *
 * @module web-platform-dev/src/pages/themes/ThemeHubPage
 */

import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { THEME_SECTIONS, themeSectionPath } from "./theme-sections";

export function ThemeHubPage(): ReactElement {
  const navigate = useNavigate();

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">Тема</h1>
      </div>

      <p className="wb-text-muted">
        Вигляд застосунку: характер, кольори й шрифт. Схему можна зберегти, повертатись до неї — і
        поділитися нею з іншими.
      </p>

      <nav className="wb-theme-nav" aria-label="Розділи теми">
        {THEME_SECTIONS.map((section) => (
          <button
            key={section.key}
            type="button"
            className="wb-theme-nav-item"
            onClick={() => navigate(themeSectionPath(section.key))}
          >
            <span className="wb-theme-nav-icon">
              <Icon name={section.icon} size={22} />
            </span>
            <span className="wb-theme-nav-text">
              <span className="wb-theme-nav-label">{section.label}</span>
              <span className="wb-theme-nav-hint">{section.hint}</span>
            </span>
            <span className="wb-theme-nav-more">
              <Icon name="chevron-right" size={18} />
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
