/**
 * `/profile/theme` — хаб теми: список її розділів.
 *
 * **Список, а не форма.** Тема — це місце, куди приходять обирати: спершу
 * характер (стиль), потім готове, далі своє.
 *
 * **Другий рядок пункту — стан, а не пояснення.** «Характер продукту: Apple чи
 * Material» читають один раз, а «Apple» потрібне щоразу: людина приходить сюди
 * саме щоб побачити, що в неї стоїть. Пояснення тут було б шумом, який щоразу
 * треба перечитувати, щоб знайти серед нього відповідь.
 *
 * **Рядок — адреса, а не поверхня.** Кожен розділ має свою сторінку зі своєю
 * адресою: її видно в рядку браузера, пам'ятає історія, можна надіслати, а
 * «назад» вертає **сюди**, а не виходить із застосунку.
 *
 * @module web-platform-dev/src/pages/themes/ThemeHubPage
 */

import type { ReactElement, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { THEME_SECTIONS, themeSectionPath, type ThemeSection } from "./theme-sections";
import { useThemeLook } from "./useThemeLook";

export function ThemeHubPage(): ReactElement {
  const navigate = useNavigate();
  const look = useThemeLook();

  /** Що показати під підписом пункту: сьогоднішній вибір людини. */
  function valueOf(section: ThemeSection): ReactNode {
    if (section === "style") return look.style;
    if (section === "presets") return look.theme;
    return (
      <>
        {/* Кольори показуються зразками: три шістнадцяткові коди не читаються,
            а три кола видно з першого погляду. */}
        {look.complete && (
          <span className="wb-theme-nav-dots" aria-hidden="true">
            <span className="wb-theme-dot" style={{ background: look.colors.bg }} />
            <span className="wb-theme-dot" style={{ background: look.colors.text }} />
            <span className="wb-theme-dot" style={{ background: look.colors.accent }} />
          </span>
        )}
        {look.font}
      </>
    );
  }

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">Тема</h1>
      </div>

      <nav className="wb-theme-nav" aria-label="Розділи теми">
        {THEME_SECTIONS.map((section) => {
          const value = valueOf(section.key);
          return (
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
                {value !== null && <span className="wb-theme-nav-hint">{value}</span>}
              </span>
              <span className="wb-theme-nav-more">
                <Icon name="chevron-right" size={18} />
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
