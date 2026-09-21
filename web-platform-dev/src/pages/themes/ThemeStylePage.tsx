/**
 * `/profile/theme/style` — характер продукту: Apple чи Material.
 *
 * **Стиль — не тема.** Тема (три кольори + шрифт) — те, що людина створює сама
 * й ділить з іншими; стиль — характер продукту, і він у тему не входить
 * (AGENTS.md §8). Тому він стоїть окремим розділом, а не полем у формі теми:
 * інакше «поділитись темою» означало б нав'язати комусь і характер.
 *
 * **Стан показує знак, а не підпис.** Галочка в тому ж місці, де в невибраного
 * пункту стоїть його іконка, — цього досить: підпис «Вибрано» поруч із
 * галочкою та ще й із назвою характеру був третім словом про те саме.
 *
 * Рядок тут той самий, що в хабі (`wb-theme-nav-item`): вибір читається очима,
 * тож виглядає як вибір, а не як форма з перемикачами.
 *
 * @module web-platform-dev/src/pages/themes/ThemeStylePage
 */

import type { ReactElement } from "react";
import { Icon, useStyleTheme } from "@wwwuabot/shared";

export function ThemeStylePage(): ReactElement {
  const { brand, setBrand, brands } = useStyleTheme();

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">Стиль</h1>
      </div>

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
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
