/**
 * Перемикач вигляду списку — сегментована смуга з двох варіантів.
 *
 * Стоїть у шапці екрана зі списком пунктів (хаб «Створити»), праворуч від
 * заголовка: це вибір вигляду, тож обидва варіанти мають бути видні одразу —
 * на відміну від решти виборів продукту, які відкривають повноекранний список
 * (`MenuModal`). Варіантів рівно два, і відкривати заради них поверхню над
 * сторінкою було б гірше.
 *
 * **Тільки знаки, без підписів.** У смузі сегмент ділить місце із заголовком, і
 * два підписи з'їдали б рядок; знак варіант читає за формою («плитки» —
 * картка, «рядки» — три риски). Ім'я при цьому не губиться: воно в
 * `aria-label` і `title`, а самі варіанти приходять із `SECTIONS_LAYOUT_OPTIONS`.
 *
 * @module web-platform-dev/src/pages/SectionLayoutSwitch
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { MenuLayout } from "@wwwuabot/ui/menu";
import { SECTIONS_LAYOUT_OPTIONS } from "./section-layout";

interface SectionLayoutSwitchProps {
  layout: MenuLayout;
  onChange: (layout: MenuLayout) => void;
}

export function SectionLayoutSwitch({ layout, onChange }: SectionLayoutSwitchProps): ReactElement {
  return (
    <div className="wb-segmented" role="group" aria-label="Вигляд списку">
      {SECTIONS_LAYOUT_OPTIONS.map((option) => {
        const active = option.key === layout;
        return (
          <button
            key={option.key}
            type="button"
            className={`wb-segmented-btn${active ? " wb-segmented-btn--active" : ""}`}
            aria-label={option.label}
            aria-pressed={active}
            title={option.label}
            onClick={() => onChange(option.key)}
          >
            <Icon name={option.icon} size={18} />
          </button>
        );
      })}
    </div>
  );
}
