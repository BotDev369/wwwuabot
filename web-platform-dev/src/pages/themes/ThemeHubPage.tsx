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
import { SideBarMenu } from "@wwwuabot/ui/nav";
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
          <span className="wb-nav-dots" aria-hidden="true">
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

      {/* Список розділів — **спільний сайдбар** (`SideBarMenu`), а не своя
          розмітка: тут він стоїть у сторінці, тож коробки (`aside`) немає, а
          вигляд пункту той самий, що в меню адмінки й у панелі Простору. */}
      <SideBarMenu
        label="Розділи теми"
        sections={[
          {
            key: "theme",
            items: THEME_SECTIONS.map((section) => ({
              key: section.key,
              label: section.label,
              icon: section.icon,
              hint: valueOf(section.key),
              // Шеврон — бо за пунктом стоїть екран зі своєю адресою.
              more: true,
              href: themeSectionPath(section.key),
              onSelect: () => navigate(themeSectionPath(section.key)),
            })),
          },
        ]}
      />
    </div>
  );
}
