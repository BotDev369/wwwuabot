/**
 * `/profile/theme/style` — характер продукту: Apple чи Material.
 *
 * **Стиль — не схема.** Схема (три кольори + шрифт) — те, що людина створює
 * сама й ділить з іншими; стиль — характер продукту, і він не входить у схему
 * (AGENTS.md §8). Тому він стоїть окремим розділом, а не полем у формі схеми:
 * інакше «поділитись схемою» означало б нав'язати комусь і характер.
 *
 * Рядок тут той самий, що в хабі (`wb-theme-nav-item`): вибір читається очима,
 * тож виглядає як вибір, а не як форма з перемикачами.
 *
 * @module web-platform-dev/src/pages/themes/ThemeStylePage
 */

import type { ReactElement } from "react";
import { Icon, useStyleTheme } from "@wwwuabot/shared";

/** Що саме змінює кожен характер — одним рядком, без технічних подробиць. */
const BRAND_HINTS: Record<string, string> = {
  apple: "Спокійні радіуси, щільна сітка, знайоме з iPhone",
  android: "Пружні форми, просторіші відступи, знайоме з Android",
};

export function ThemeStylePage(): ReactElement {
  const { brand, setBrand, brands } = useStyleTheme();

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">Стиль</h1>
      </div>

      <p className="wb-text-muted">
        Характер застосунку: як поводяться кнопки, які відступи й наскільки округлі картки. Кольори
        й шрифт від нього не залежать.
      </p>

      <div className="wb-theme-nav" role="radiogroup" aria-label="Стиль">
        {brands.map((definition) => {
          const active = definition.id === brand;
          return (
            <button
              key={definition.id}
              type="button"
              role="radio"
              aria-checked={active}
              className="wb-theme-nav-item"
              onClick={() => setBrand(definition.id)}
            >
              <span className="wb-theme-nav-icon">
                <Icon name={active ? "check" : "sliders"} size={22} />
              </span>
              <span className="wb-theme-nav-text">
                <span className="wb-theme-nav-label">{definition.labelUk}</span>
                <span className="wb-theme-nav-hint">
                  {BRAND_HINTS[definition.id] ?? "Характер застосунку"}
                </span>
              </span>
              {active && <span className="wb-badge wb-badge-accent">Вибрано</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
